import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@openagent/client-core": path.resolve(
        __dirname,
        "../../packages/openagent-client-core/src/index.ts",
      ),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
