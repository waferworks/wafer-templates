import { Hono } from "hono";

import { authenticateClerkRequest, isClerkServerConfigured } from "@/server/auth/clerk";

import type { AppBindings } from "../index";

const authRoute = new Hono<AppBindings>().get("/session", async (c) => {
  const auth = await authenticateClerkRequest(c.req.raw);

  return c.json({
    isConfigured: isClerkServerConfigured(),
    isSignedIn: Boolean(auth),
    orgId: auth?.orgId ?? null,
    userId: auth?.userId ?? null,
  });
});

export default authRoute;
