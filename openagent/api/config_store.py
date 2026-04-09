"""Round-trip preserving config file helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any


class ConfigStore:
    """Read and update ``openagent.yaml`` while preserving formatting."""

    def __init__(self, path: str | Path):
        self.path = Path(path).expanduser().resolve()

    def _yaml(self):
        try:
            from ruamel.yaml import YAML
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError(
                "ruamel.yaml is required for config editing. "
                "Install openagent-framework with the API dependencies."
            ) from exc

        yaml = YAML()
        yaml.preserve_quotes = True
        yaml.indent(mapping=2, sequence=4, offset=2)
        return yaml

    def _commented_types(self):
        from ruamel.yaml.comments import CommentedMap, CommentedSeq

        return CommentedMap, CommentedSeq

    def _load_document(self):
        yaml = self._yaml()
        CommentedMap, _ = self._commented_types()
        if not self.path.exists():
            return yaml, CommentedMap()
        with self.path.open("r", encoding="utf-8") as fh:
            data = yaml.load(fh)
        return yaml, data or CommentedMap()

    def read_raw(self) -> str:
        if not self.path.exists():
            return ""
        return self.path.read_text(encoding="utf-8")

    def read_data(self) -> dict[str, Any]:
        _, doc = self._load_document()
        return self._to_plain(doc)

    def write_raw(self, content: str) -> dict[str, Any]:
        yaml = self._yaml()
        doc = yaml.load(content or "") or {}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as fh:
            yaml.dump(doc, fh)
        return self._to_plain(doc)

    def write_data(self, payload: dict[str, Any]) -> dict[str, Any]:
        yaml, doc = self._load_document()
        merged = self._merge_roundtrip(doc, payload)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as fh:
            yaml.dump(merged, fh)
        return self._to_plain(merged)

    def list_mcps(self) -> list[dict[str, Any]]:
        data = self.read_data()
        mcps = data.get("mcp", []) or []
        return [m for m in mcps if isinstance(m, dict)]

    def upsert_mcp(self, payload: dict[str, Any]) -> dict[str, Any]:
        name = str(payload.get("name") or "").strip()
        if not name:
            raise ValueError("MCP entry requires a non-empty 'name'")

        yaml, doc = self._load_document()
        CommentedMap, CommentedSeq = self._commented_types()
        mcp_list = doc.get("mcp")
        if not isinstance(mcp_list, CommentedSeq):
            mcp_list = CommentedSeq()
            doc["mcp"] = mcp_list

        target_idx = None
        for idx, entry in enumerate(mcp_list):
            if isinstance(entry, dict) and entry.get("name") == name:
                target_idx = idx
                break

        merged_entry = self._merge_roundtrip(CommentedMap(), payload)
        if target_idx is None:
            mcp_list.append(merged_entry)
        else:
            mcp_list[target_idx] = merged_entry

        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as fh:
            yaml.dump(doc, fh)
        return self._to_plain(merged_entry)

    def delete_mcp(self, name: str) -> bool:
        yaml, doc = self._load_document()
        _, CommentedSeq = self._commented_types()
        mcp_list = doc.get("mcp")
        if not isinstance(mcp_list, CommentedSeq):
            return False

        removed = False
        for idx in range(len(mcp_list) - 1, -1, -1):
            entry = mcp_list[idx]
            if isinstance(entry, dict) and entry.get("name") == name:
                del mcp_list[idx]
                removed = True

        if removed:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("w", encoding="utf-8") as fh:
                yaml.dump(doc, fh)
        return removed

    def _merge_roundtrip(self, existing: Any, incoming: Any) -> Any:
        CommentedMap, CommentedSeq = self._commented_types()

        if isinstance(incoming, dict):
            target = existing if isinstance(existing, CommentedMap) else CommentedMap()
            for key in list(target.keys()):
                if key not in incoming:
                    del target[key]
            for key, value in incoming.items():
                target[key] = self._merge_roundtrip(target.get(key), value)
            return target

        if isinstance(incoming, list):
            seq = CommentedSeq()
            for item in incoming:
                seq.append(self._merge_roundtrip(None, item))
            return seq

        return incoming

    def _to_plain(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(k): self._to_plain(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._to_plain(v) for v in value]
        return value
