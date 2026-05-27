// addon:client-provider-imports
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

// addon:client-auth-imports
import { DefaultCatchBoundary } from "@/client/components/default-catch-boundary";
import { DefaultNotFound } from "@/client/components/default-not-found";
import { indexRoute } from "@/client/routes/index";
// addon:client-route-imports

import { rootRoute } from "./routes/__root";

import "@/styles.css";

const routeTree = rootRoute.addChildren([
  indexRoute,
  // addon:client-routes
]);
const router = createRouter({
  routeTree,
  defaultErrorComponent: DefaultCatchBoundary,
  defaultNotFoundComponent: DefaultNotFound,
});
// addon:client-render-wrapper

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Could not find the root element.");
}

ReactDOM.createRoot(root).render(<RouterProvider router={router} />);
