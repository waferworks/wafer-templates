import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { parsePort } from "./src/env/server";

const port = parsePort(process.env.PORT);

export default defineConfig({
  appType: "custom",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./index.html"),
    },
  },
});
