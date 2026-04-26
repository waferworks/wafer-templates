# default-web

A Wafer-ready full-stack starter built with Bun, Hono, Vite, React, Drizzle, Zod, Tailwind v4, minimal shadcn-inspired UI primitives, and TanStack Router + Query.

The bundled UI components are intentionally lightweight and shadcn-inspired. The shadcn CLI is not configured in this template.

## Scaffold

```sh
bunx degit waferworks/wafer-templates/templates/default-web my-app
```

## File tree

- `src/server/` contains the Hono app, API routes, and Drizzle-backed repository.
- `src/server/db/` contains one repository file per resource plus shared database connection code.
- `src/server/services/` contains reusable server-side business logic.
- `src/client/` contains the React app, route files, typed API helpers, and UI components.
- `src/shared/` contains Zod schemas shared between the server and the browser.
- `public/index.html` is the HTML shell used by the unified dev server and by the production build.

## Routing

This template uses TanStack Router in code, not generated file-based routing. New routes are attached in `src/client/main.tsx`.

## Common changes

- Add a page: `src/client/routes/` and `src/client/main.tsx`
- Add an API route: `src/shared/schemas.ts`, `src/server/routes/`, `src/server/index.ts`, `src/client/api.ts`
- Add a DB-backed feature: `src/server/db/`, `src/server/services/`, `src/shared/schemas.ts`, `drizzle/`
- Add a form: `src/shared/schemas.ts`, `src/client/components/`, `src/client/api.ts`, `src/server/routes/`

## Wafer runtime constraints

- The app binds only to `127.0.0.1` and `process.env.PORT`.
- The database connection comes only from `process.env.DATABASE_URL`.
- Health checks live at `/health`.
- No Docker, PM2, or docker-compose files are included because Wafer already provides the runtime and supervisor.

## Local workflow

```sh
bun install
bun run db:generate
bun run db:migrate
bun run dev
bun run check
bun run smoke
```

`bun run db:push` is available as a fast local sync tool, but committed migrations are the default workflow.

## Extending the template

To add a table, edit `src/server/db/schema.ts`, generate a migration, and then run `bun run db:migrate`.

To add an API route, create a new file in `src/server/routes/` and mount it in `src/server/index.ts`.

To add a page, create a new route file in `src/client/routes/` and attach it to the router tree in `src/client/main.tsx`.


## Deploying with wafer-deploy

From the scaffolded app directory:

```sh
wafer-deploy
```

`wafer-deploy` will pick up the package scripts automatically. The app exposes `/health`, so Wafer can infer a health check path without extra flags.
