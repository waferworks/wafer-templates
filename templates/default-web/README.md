# default-web

A Wafer-ready full-stack starter built with Bun, Hono, Vite, React, Drizzle, Zod, Tailwind v4, shadcn-style UI primitives, and TanStack Router + Query.

## Scaffold

```sh
bunx degit waferworks/wafer-templates/templates/default-web my-app
```

## File tree

- `src/server/` contains the Hono app, API routes, and Drizzle-backed repository.
- `src/client/` contains the React app, route files, typed API helpers, and UI components.
- `src/shared/` contains Zod schemas shared between the server and the browser.
- `public/index.html` is the HTML shell used by the unified dev server and by the production build.

## Wafer runtime constraints

- The app binds only to `127.0.0.1` and `process.env.PORT`.
- The database connection comes only from `process.env.DATABASE_URL`.
- Health checks live at `/health`.
- No Docker, PM2, or docker-compose files are included because Wafer already provides the runtime and supervisor.

## Local workflow

```sh
bun install
bun run db:push
bun run dev
```

## Extending the template

To add a table, edit `src/server/db/schema.ts` and then run `bun run db:push`.

To add an API route, create a new file in `src/server/routes/` and mount it in `src/server/index.ts`.

To add a page, create a new route file in `src/client/routes/` and attach it to the router tree in `src/client/main.tsx`.

## Deploying with wafer-deploy

From the scaffolded app directory:

```sh
wafer-deploy
```

`wafer-deploy` will pick up the package scripts automatically. The app exposes `/health`, so Wafer can infer a health check path without extra flags.
