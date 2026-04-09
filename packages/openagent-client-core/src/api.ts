import type {
  ChatEvent,
  ConnectionProfile,
  MemoryGraphEdge,
  MemoryGraphNode,
  RuntimeInfo,
} from "./types";

type JsonRecord = Record<string, unknown>;

export class OpenAgentClient {
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  wsUrl(pathname: string): string {
    const url = new URL(pathname, this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }

  async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(pathname, this.baseUrl), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }

  health(): Promise<RuntimeInfo> {
    return this.request<RuntimeInfo>("/api/health");
  }

  runtime(): Promise<RuntimeInfo> {
    return this.request<RuntimeInfo>("/api/runtime");
  }

  getConfig(): Promise<JsonRecord> {
    return this.request<JsonRecord>("/api/config");
  }

  putConfig(config: JsonRecord): Promise<{ config: JsonRecord; restartRequired: boolean }> {
    return this.request("/api/config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  getRawConfig(): Promise<{ content: string }> {
    return this.request("/api/config/raw");
  }

  putRawConfig(content: string): Promise<{ config: JsonRecord; restartRequired: boolean }> {
    return this.request("/api/config/raw", {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  listMcps(): Promise<{ items: JsonRecord[] }> {
    return this.request("/api/config/mcps");
  }

  upsertMcp(name: string, payload: JsonRecord): Promise<{ item: JsonRecord; restartRequired: boolean }> {
    return this.request(`/api/config/mcps/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  deleteMcp(name: string): Promise<{ deleted: boolean; restartRequired: boolean }> {
    return this.request(`/api/config/mcps/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  memoryTree(): Promise<{ items: JsonRecord[] }> {
    return this.request("/api/memory/tree");
  }

  readNote(path: string): Promise<JsonRecord> {
    return this.request(`/api/memory/note?path=${encodeURIComponent(path)}`);
  }

  writeNote(path: string, content: string): Promise<JsonRecord> {
    return this.request("/api/memory/note", {
      method: "PUT",
      body: JSON.stringify({ path, content }),
    });
  }

  deleteNote(path: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/memory/note?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  renameNote(path: string, newPath: string): Promise<JsonRecord> {
    return this.request("/api/memory/note/rename", {
      method: "POST",
      body: JSON.stringify({ path, newPath }),
    });
  }

  searchMemory(query: string): Promise<{ items: JsonRecord[] }> {
    return this.request(`/api/memory/search?q=${encodeURIComponent(query)}`);
  }

  memoryGraph(): Promise<{ nodes: MemoryGraphNode[]; edges: MemoryGraphEdge[] }> {
    return this.request("/api/memory/graph");
  }

  serviceStatus(): Promise<{ status: string }> {
    return this.request("/api/service/status");
  }

  async runChat(options: {
    conversationId: string;
    message: string;
    attachments?: JsonRecord[];
    onEvent: (event: ChatEvent) => void;
  }): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl("/api/chat/ws"));
      let finished = false;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "run",
            conversationId: options.conversationId,
            message: options.message,
            attachments: options.attachments ?? [],
          }),
        );
      };

      ws.onmessage = (event) => {
        const parsed = JSON.parse(String(event.data)) as ChatEvent;
        options.onEvent(parsed);
        if (parsed.type === "run_finished") {
          finished = true;
          ws.close();
          resolve();
        } else if (parsed.type === "run_error") {
          finished = true;
          ws.close();
          reject(new Error(String(parsed.error ?? "Unknown chat error")));
        }
      };

      ws.onerror = () => {
        if (!finished) {
          reject(new Error("WebSocket connection failed"));
        }
      };

      ws.onclose = () => {
        if (!finished) {
          resolve();
        }
      };
    });
  }
}

export function createClient(profile: ConnectionProfile): OpenAgentClient {
  return new OpenAgentClient(profile.baseUrl);
}
