import { createFileRoute } from "@tanstack/react-router";

import { buildHealthResponse } from "@/server/health";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => buildHealthResponse(),
    },
  },
});
