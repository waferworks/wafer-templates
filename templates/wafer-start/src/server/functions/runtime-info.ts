import { createServerFn } from "@tanstack/react-start";

import { getDatabaseMode } from "@/server/db/bootstrap";
import { runtimeInfoSchema } from "@/shared/schemas";

export const loadRuntimeInfo = createServerFn({ method: "GET" }).handler(async () => {
  return runtimeInfoSchema.parse({
    databaseConfigured: getDatabaseMode() !== "unconfigured",
  });
});
