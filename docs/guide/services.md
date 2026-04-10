# Services

Auxiliary services run alongside the agent and share its lifecycle. Each service follows the `AuxService` base class pattern.

## Custom Services

No built-in services currently. The pattern is available for extensions:

```python
from openagent.services.base import AuxService

class MyService(AuxService):
    name = "my-service"
    
    async def start(self): ...
    async def stop(self): ...
    async def status(self) -> str: ...
```

### Manual Control

```bash
openagent services status
openagent services start
openagent services stop
```
