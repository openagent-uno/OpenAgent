"""HTTP and WebSocket app API for OpenAgent."""

from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any, Callable

from openagent.agent import AgentEvent
from openagent.api.config_store import ConfigStore
from openagent.api.memory import MemoryStore
from openagent.config import load_config
from openagent.runtime import get_runtime_paths, resolve_config_path
from openagent.service import get_service_status

logger = logging.getLogger(__name__)

try:  # pragma: no cover - import guard
    from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError as exc:  # pragma: no cover - dependency guard
    FastAPI = None
    HTTPException = RuntimeError
    WebSocket = Any
    WebSocketDisconnect = Exception
    uvicorn = None
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


def _runtime_snapshot(config_path: Path) -> dict[str, Any]:
    runtime_paths = get_runtime_paths()
    config = load_config(config_path)
    return {
        "ok": True,
        "configPath": str(config_path),
        "runtimeRoot": str(runtime_paths.root),
        "memoryPath": config.get("memory", {}).get("vault_path"),
        "dbPath": config.get("memory", {}).get("db_path"),
        "serviceStatus": get_service_status(),
        "api": config.get("api", {}),
    }


def create_app(
    agent,
    config_path: str | Path,
    config_supplier: Callable[[], dict[str, Any]] | None = None,
):
    if FastAPI is None or uvicorn is None:  # pragma: no cover - dependency guard
        raise RuntimeError(
            "FastAPI and uvicorn are required for the OpenAgent app API."
        ) from _IMPORT_ERROR

    resolved_config_path = resolve_config_path(config_path)
    app = FastAPI(title="OpenAgent App API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def current_config() -> dict[str, Any]:
        if config_supplier is not None:
            return config_supplier()
        return load_config(resolved_config_path)

    def config_store() -> ConfigStore:
        return ConfigStore(resolved_config_path)

    def memory_store() -> MemoryStore:
        cfg = current_config()
        memory_path = cfg.get("memory", {}).get("vault_path")
        return MemoryStore(memory_path)

    @app.get("/api/health")
    async def health():
        return _runtime_snapshot(resolved_config_path)

    @app.get("/api/runtime")
    async def runtime_info():
        return _runtime_snapshot(resolved_config_path)

    @app.get("/api/config")
    async def get_config():
        return current_config()

    @app.put("/api/config")
    async def put_config(payload: dict[str, Any]):
        updated = config_store().write_data(payload)
        return {"config": updated, "restartRequired": True}

    @app.get("/api/config/raw")
    async def get_config_raw():
        return {"content": config_store().read_raw()}

    @app.put("/api/config/raw")
    async def put_config_raw(payload: dict[str, Any]):
        content = str(payload.get("content") or "")
        updated = config_store().write_raw(content)
        return {"config": updated, "restartRequired": True}

    @app.get("/api/config/mcps")
    async def get_mcps():
        return {"items": config_store().list_mcps()}

    @app.put("/api/config/mcps/{name}")
    async def put_mcp(name: str, payload: dict[str, Any]):
        entry = dict(payload)
        entry["name"] = name
        return {"item": config_store().upsert_mcp(entry), "restartRequired": True}

    @app.delete("/api/config/mcps/{name}")
    async def delete_mcp(name: str):
        deleted = config_store().delete_mcp(name)
        if not deleted:
            raise HTTPException(status_code=404, detail="MCP entry not found")
        return {"deleted": True, "restartRequired": True}

    @app.get("/api/memory/tree")
    async def memory_tree():
        return {"items": memory_store().tree()}

    @app.get("/api/memory/note")
    async def get_note(path: str):
        try:
            return memory_store().read_note(path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.put("/api/memory/note")
    async def put_note(payload: dict[str, Any]):
        try:
            note = memory_store().write_note(
                str(payload.get("path") or ""),
                str(payload.get("content") or ""),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return note

    @app.delete("/api/memory/note")
    async def delete_note(path: str):
        try:
            memory_store().delete_note(path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"deleted": True}

    @app.post("/api/memory/note/rename")
    async def rename_note(payload: dict[str, Any]):
        try:
            return memory_store().rename_note(
                str(payload.get("path") or ""),
                str(payload.get("newPath") or ""),
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/memory/search")
    async def memory_search(q: str = ""):
        return {"items": memory_store().search(q)}

    @app.get("/api/memory/graph")
    async def memory_graph():
        return memory_store().graph()

    @app.get("/api/service/status")
    async def service_status():
        return {"status": get_service_status()}

    @app.websocket("/api/chat/ws")
    async def chat_ws(websocket: WebSocket):
        await websocket.accept()
        while True:
            try:
                payload = await websocket.receive_json()
            except WebSocketDisconnect:
                return

            msg_type = payload.get("type") or "run"
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            if msg_type != "run":
                await websocket.send_json(
                    {
                        "type": "run_error",
                        "error": f"Unsupported websocket message type: {msg_type}",
                    }
                )
                continue

            conversation_id = str(payload.get("conversationId") or uuid.uuid4().hex)
            message = str(payload.get("message") or "")
            attachments = payload.get("attachments")

            async def on_event(event: AgentEvent) -> None:
                body = {"type": event.type, "conversationId": conversation_id}
                body.update(event.data)
                await websocket.send_json(body)

            await agent.run(
                message=message,
                session_id=f"app:{conversation_id}",
                attachments=attachments if isinstance(attachments, list) else None,
                on_event=on_event,
            )

    return app


class AppAPIServer:
    name = "api"

    def __init__(
        self,
        agent,
        config: dict[str, Any],
        config_path: str | Path,
        config_supplier: Callable[[], dict[str, Any]] | None = None,
    ) -> None:
        self.agent = agent
        self.config = config
        self.config_path = resolve_config_path(config_path)
        api_cfg = config.get("api", {}) or {}
        self.host = api_cfg.get("host", "127.0.0.1")
        self.port = int(api_cfg.get("port", 8765))
        self._config_supplier = config_supplier
        self._server = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if FastAPI is None or uvicorn is None:  # pragma: no cover - dependency guard
            raise RuntimeError(
                "FastAPI and uvicorn are required for the OpenAgent app API."
            ) from _IMPORT_ERROR
        if self._task and not self._task.done():
            return

        app = create_app(
            agent=self.agent,
            config_path=self.config_path,
            config_supplier=self._config_supplier,
        )
        config = uvicorn.Config(
            app,
            host=self.host,
            port=self.port,
            loop="asyncio",
            access_log=False,
            log_level="warning",
        )
        self._server = uvicorn.Server(config)
        self._task = asyncio.create_task(self._server.serve(), name="openagent-api")
        while not self._server.started and not self._task.done():
            await asyncio.sleep(0.05)
        if self._task.done():
            await self._task
        logger.info("OpenAgent app API listening on http://%s:%s", self.host, self.port)

    async def stop(self) -> None:
        if self._server is not None:
            self._server.should_exit = True
        if self._task is not None:
            try:
                await self._task
            except Exception:
                pass
        self._server = None
        self._task = None

    async def status(self) -> str:
        if self._task and not self._task.done():
            return f"running on http://{self.host}:{self.port}"
        return "stopped"
