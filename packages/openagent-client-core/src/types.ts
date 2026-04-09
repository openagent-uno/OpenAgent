export type ConnectionMode = "local" | "remote";

export interface ConnectionProfile {
  label: string;
  baseUrl: string;
  mode: ConnectionMode;
  tunnelId?: string;
  ssh?: {
    host: string;
    user?: string;
    port?: number;
    localPort?: number;
    remotePort?: number;
    identityFile?: string;
  };
}

export interface RuntimeInfo {
  ok: boolean;
  configPath: string;
  runtimeRoot: string;
  memoryPath: string;
  dbPath: string;
  serviceStatus: string;
  api: {
    enabled: boolean;
    host: string;
    port: number;
  };
}

export interface ChatEvent {
  type:
    | "run_started"
    | "status"
    | "tool_started"
    | "tool_finished"
    | "tool_failed"
    | "assistant_delta"
    | "assistant_message"
    | "run_finished"
    | "run_error"
    | "pong";
  conversationId?: string;
  [key: string]: unknown;
}

export interface MemoryGraphNode {
  id: string;
  path: string;
  label: string;
  tags?: string[];
}

export interface MemoryGraphEdge {
  source: string;
  target: string;
  label?: string;
}
