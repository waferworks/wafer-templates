import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

import { isClerkEnabled } from "@/env/server";

export const startInstance = createStart(() => ({
  requestMiddleware: isClerkEnabled(process.env) ? [clerkMiddleware()] : [],
}));
