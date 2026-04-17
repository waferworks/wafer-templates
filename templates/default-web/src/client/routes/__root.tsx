import { Outlet, createRootRoute } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_32%),linear-gradient(180deg,_#f8f4ec_0%,_#f2eee7_45%,_#ebe7e0_100%)] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-10 flex flex-col gap-6 border-b border-stone-300/70 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-stone-500">Wafer starter</p>
            <h1 className="font-[Iowan_Old_Style,Georgia,serif] text-4xl leading-tight sm:text-5xl">
              default-web
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-700">
              A full-stack template with one typed API, one typed form, one real Postgres table, and
              one server that respects Wafer runtime rules from day one.
            </p>
          </div>
          <div className="max-w-sm rounded-[24px] border border-stone-300/80 bg-white/70 p-4 text-sm leading-6 text-stone-600 shadow-sm">
            <strong className="block text-stone-950">Runtime contract</strong>
            127.0.0.1 + PORT, DATABASE_URL only, /health exposed, no Docker overhead.
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
