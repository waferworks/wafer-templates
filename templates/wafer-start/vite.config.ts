import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

function parsePort(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "3000", 10);
  return Number.isFinite(parsed) ? parsed : 3000;
}

export default defineConfig({
  server: {
    host: process.env.HOST || "127.0.0.1",
    port: parsePort(process.env.PORT),
    strictPort: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
    nitro(),
  ],
});
