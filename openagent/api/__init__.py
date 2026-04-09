"""OpenAgent app API package."""

__all__ = ["AppAPIServer", "create_app"]


def __getattr__(name: str):
    if name in {"AppAPIServer", "create_app"}:
        from openagent.api.server import AppAPIServer, create_app

        return {"AppAPIServer": AppAPIServer, "create_app": create_app}[name]
    raise AttributeError(name)
