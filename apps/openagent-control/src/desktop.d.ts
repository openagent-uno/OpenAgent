export {};

declare global {
  interface Window {
    openAgentDesktop?: {
      isDesktop: boolean;
      service: {
        install(): Promise<string>;
        start(): Promise<string>;
        stop(): Promise<string>;
        restart(): Promise<string>;
        status(): Promise<string>;
      };
      ssh: {
        openTunnel(options: {
          host: string;
          user?: string;
          port?: number;
          localPort?: number;
          remotePort?: number;
          identityFile?: string;
        }): Promise<{ id: string; localPort: number }>;
        closeTunnel(id: string): Promise<void>;
      };
    };
  }
}
