import { getTodoService } from "@/server/runtime";
import { healthResponseSchema } from "@/shared/schemas";

export async function buildHealthResponse() {
  const healthy = await getTodoService().healthCheck();
  const status = healthy ? "ok" : "waiting-for-database";

  return Response.json(healthResponseSchema.parse({ status }), {
    status: healthy ? 200 : 503,
  });
}
