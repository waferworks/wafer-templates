import { getServerConfig, startServer } from "./start";

export type { AppBindings, AppOptions, AppType } from "./app";
export { buildApp, registerCleanup } from "./app";
export { getServerConfig, startServer };

if (import.meta.main) {
  await startServer();
}
