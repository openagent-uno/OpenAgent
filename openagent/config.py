"""Configuration loader for OpenAgent. Supports YAML config with env var substitution."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml

from openagent.runtime import (
    default_config_path,
    default_db_path,
    default_vault_path,
    ensure_runtime_dirs,
    migrate_legacy_workspace,
    resolve_config_path,
    resolve_runtime_path,
)


DEFAULT_CONFIG_FILE = str(default_config_path())


def _substitute_env_vars(value: str) -> str:
    """Replace ${VAR_NAME} patterns with environment variable values."""
    def replacer(match: re.Match) -> str:
        var_name = match.group(1)
        env_val = os.environ.get(var_name)
        if env_val is None:
            raise ValueError(f"Environment variable {var_name} is not set")
        return env_val
    return re.sub(r"\$\{([^}]+)\}", replacer, value)


def _resolve_env_vars(data: Any) -> Any:
    """Recursively resolve env vars in config data."""
    if isinstance(data, str):
        return _substitute_env_vars(data)
    if isinstance(data, dict):
        return {k: _resolve_env_vars(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_resolve_env_vars(item) for item in data]
    return data


def _normalize_runtime_config(config: dict) -> dict:
    cfg = dict(config)

    memory = dict(cfg.get("memory", {}) or {})
    memory["db_path"] = str(
        resolve_runtime_path(memory.get("db_path") or default_db_path())
    )
    memory["vault_path"] = str(
        resolve_runtime_path(memory.get("vault_path") or default_vault_path())
    )
    cfg["memory"] = memory

    api = dict(cfg.get("api", {}) or {})
    api.setdefault("enabled", True)
    api.setdefault("host", "127.0.0.1")
    api.setdefault("port", 8765)
    cfg["api"] = api

    services = dict(cfg.get("services", {}) or {})
    syncthing = dict(services.get("syncthing", {}) or {})
    if syncthing:
        syncthing["vault_path"] = str(
            resolve_runtime_path(syncthing.get("vault_path") or memory["vault_path"])
        )
        services["syncthing"] = syncthing
        cfg["services"] = services

    return cfg


def load_config(path: str | Path | None = None) -> dict:
    """Load config from YAML file with runtime defaults applied."""
    ensure_runtime_dirs()
    if path is None:
        migrate_legacy_workspace()
    config_path = resolve_config_path(path)
    if not config_path.exists():
        return _normalize_runtime_config({})
    with open(config_path) as f:
        raw = yaml.safe_load(f) or {}
    return _normalize_runtime_config(_resolve_env_vars(raw))


def build_model_from_config(config: dict):
    """Instantiate a model from config dict."""
    from openagent.models.claude_api import ClaudeAPI
    from openagent.models.claude_cli import ClaudeCLI
    from openagent.models.zhipu import ZhipuGLM

    model_cfg = config.get("model", {})
    provider = model_cfg.get("provider", "claude-api")

    if provider == "claude-api":
        return ClaudeAPI(
            model=model_cfg.get("model_id", "claude-sonnet-4-6"),
            api_key=model_cfg.get("api_key"),
        )
    elif provider == "claude-cli":
        return ClaudeCLI(
            model=model_cfg.get("model_id"),
            permission_mode=model_cfg.get("permission_mode", "bypass"),
        )
    elif provider == "zhipu":
        return ZhipuGLM(
            model=model_cfg.get("model_id", "glm-5"),
            api_key=model_cfg.get("api_key"),
            base_url=model_cfg.get("base_url", "https://api.z.ai/api/paas/v4"),
        )
    else:
        raise ValueError(f"Unknown model provider: {provider}")
