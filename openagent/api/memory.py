"""Memory vault helpers for the app API."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

_WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)")


class MemoryStore:
    def __init__(self, root: str | Path):
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, relative_path: str) -> Path:
        if not relative_path:
            raise ValueError("path is required")
        path = (self.root / relative_path).expanduser().resolve()
        if self.root not in path.parents and path != self.root:
            raise ValueError("path escapes the memory root")
        return path

    def tree(self) -> list[dict[str, Any]]:
        return self._tree_node(self.root).get("children", [])

    def _tree_node(self, path: Path) -> dict[str, Any]:
        rel = "" if path == self.root else str(path.relative_to(self.root))
        node = {
            "name": path.name if path != self.root else self.root.name,
            "path": rel,
            "type": "directory" if path.is_dir() else "file",
        }
        if path.is_dir():
            children = [
                self._tree_node(child)
                for child in sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            ]
            node["children"] = children
        return node

    def read_note(self, relative_path: str) -> dict[str, Any]:
        path = self._resolve(relative_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(relative_path)
        content = path.read_text(encoding="utf-8")
        frontmatter, body = self._split_frontmatter(content)
        return {
            "path": str(path.relative_to(self.root)),
            "title": frontmatter.get("title") or path.stem,
            "content": content,
            "body": body,
            "frontmatter": frontmatter,
            "links": self._extract_links(content),
        }

    def write_note(self, relative_path: str, content: str) -> dict[str, Any]:
        path = self._resolve(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return self.read_note(str(path.relative_to(self.root)))

    def delete_note(self, relative_path: str) -> None:
        path = self._resolve(relative_path)
        if not path.exists():
            raise FileNotFoundError(relative_path)
        path.unlink()

    def rename_note(self, relative_path: str, new_relative_path: str) -> dict[str, Any]:
        source = self._resolve(relative_path)
        target = self._resolve(new_relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        source.rename(target)
        return self.read_note(str(target.relative_to(self.root)))

    def search(self, query: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        needle = query.lower().strip()
        if not needle:
            return results
        for note in self.root.rglob("*.md"):
            content = note.read_text(encoding="utf-8")
            haystack = content.lower()
            if needle not in haystack and needle not in note.name.lower():
                continue
            idx = haystack.find(needle)
            start = max(0, idx - 80)
            end = min(len(content), idx + 160)
            results.append(
                {
                    "path": str(note.relative_to(self.root)),
                    "title": note.stem,
                    "snippet": content[start:end].strip(),
                }
            )
        return results

    def graph(self) -> dict[str, list[dict[str, Any]]]:
        notes = list(self.root.rglob("*.md"))
        alias_map: dict[str, str] = {}
        nodes: list[dict[str, Any]] = []
        for note in notes:
            rel = str(note.relative_to(self.root))
            content = note.read_text(encoding="utf-8")
            frontmatter, _ = self._split_frontmatter(content)
            alias_map[rel] = rel
            alias_map[note.stem] = rel
            alias_map[note.stem.lower()] = rel
            nodes.append(
                {
                    "id": rel,
                    "path": rel,
                    "label": frontmatter.get("title") or note.stem,
                    "tags": frontmatter.get("tags", []),
                }
            )

        edges: list[dict[str, Any]] = []
        for note in notes:
            rel = str(note.relative_to(self.root))
            content = note.read_text(encoding="utf-8")
            for link in self._extract_links(content):
                target = alias_map.get(link) or alias_map.get(link.lower()) or link
                edges.append(
                    {
                        "source": rel,
                        "target": target,
                        "label": link,
                    }
                )

        return {"nodes": nodes, "edges": edges}

    def _extract_links(self, content: str) -> list[str]:
        return [match.strip() for match in _WIKILINK_RE.findall(content or "")]

    def _split_frontmatter(self, content: str) -> tuple[dict[str, Any], str]:
        if not content.startswith("---\n"):
            return {}, content
        marker = "\n---\n"
        end = content.find(marker, 4)
        if end == -1:
            return {}, content
        raw = content[4:end]
        body = content[end + len(marker):]
        try:
            data = yaml.safe_load(raw) or {}
        except Exception:
            data = {}
        return data if isinstance(data, dict) else {}, body
