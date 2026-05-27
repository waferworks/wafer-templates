import { Outlet, createRootRoute } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <Outlet />
    </div>
  );
}
