import { Outlet, createRootRoute } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Outlet />
    </div>
  );
}
