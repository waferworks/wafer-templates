# wafer-default

A lightweight Wafer-ready full-stack starter built with Bun, Hono, Vite, React, Tailwind v4, a minimal shadcn/Base UI design system, and code-based TanStack Router.

The base template intentionally does not install database, example feature, or auth dependencies. Add those only when the app needs them.

## Scaffold

```sh
bunx degit waferworks/wafer-templates/templates/wafer-default my-app
```

## Base Stack

- Hono for the HTTP server and `/api` routes
- Vite + React for the browser app
- TanStack Router with explicit route registration in `src/client/main.tsx`
- Tailwind v4 and a minimal shadcn/Base UI design system from preset `b1Vo9kCe`
- `/health` and `/healthz` for Wafer health checks
- Custom route-level 404 and error fallbacks
- `src/app/site.ts` for starter name and title helpers
- `src/env/server.ts` for lightweight `HOST` and `PORT` parsing
- One process that defaults to `127.0.0.1` and `process.env.PORT`, with `HOST` available when a host requires it
- `components.json` for shadcn CLI compatibility using Base UI components
- `bunfig.toml` so Bun waits seven days before installing newly released package versions

## Add-ons

Install only the optional capability the app needs from `addons/`:

```sh
bun run add <needed-addon>
bun install
```

Available add-ons:

- `db`: adds Drizzle, Postgres connection code, Drizzle config, and database scripts.
- `example-feature`: adds a database-backed example feature using todos as the concrete pattern. Requires `db`.
- `auth-clerk`: adds Clerk client/server auth scaffolding. It does not require `db`.

The installer is idempotent. Fresh installs refuse to overwrite changed files. Re-running an installed add-on is a no-op unless you pass `--force` to repair its files.

## File Tree

- `src/server/app.ts` contains the Hono app, `/health`, `/api`, and server add-on hook markers.
- `src/server/start.ts` contains host/port config, HTTP startup, shutdown, and request conversion.
- `src/server/static.ts` contains Vite middleware and production asset serving.
- `src/server/index.ts` is the executable entrypoint and public server re-export surface.
- `src/server/health.ts` contains the base health response.
- `src/env/server.ts` contains dependency-free server environment parsing.
- `src/app/site.ts` contains starter metadata.
- `src/client/` contains the React app, route files, UI components, and optional API helpers.
- `src/client/components/ui/` contains the curated shadcn/Base UI primitives included in the base.
- `src/shared/` is reserved for shared browser/server contracts once an add-on or feature needs them.
- `scripts/add.ts` installs add-ons from `addons/<name>/`.
- `tests/` holds base and installer tests.
- `index.html` is the HTML shell used by the unified dev server and production build.

## Common Changes

- Add a page: create `src/client/routes/<page>.tsx` and register it in `src/client/main.tsx`.
- Add an API route: add a Hono route module under `src/server/routes/` and mount it in `src/server/app.ts`.
- Add a DB-backed feature: run `bun run add db` first, then add schema, repository, service, route, and client code.
- Add Clerk auth: run `bun run setup:auth` and finish the Clerk browser sign-in when prompted.

## Agent Decision Tree

- Static site or landing page: stay in the base and edit `src/client/routes/`.
- API without persistence: add a Hono route and tests; do not install DB.
- Persistence or Postgres: run `bun run add db`, then add schema, repository, service, route, and tests.
- Example feature pattern: run `bun run add db`, then `bun run add example-feature`.
- Login or Clerk: run `bun run setup:auth`.

## Wafer Runtime Constraints

- Bind the public server to `127.0.0.1` and `process.env.PORT`.
- Keep `/health` returning HTTP 200 when the process is healthy.
- Do not add Docker, PM2, or docker-compose files; Wafer already provides the runtime and supervisor.
- Keep build-time checks separate from runtime startup. Production should run `bun run start`, not Vite dev mode.

## Local Workflow

Base app:

```sh
bun install
bun run dev
bun run lint
bun run build
bun run test
bun run smoke
bun run check:addons
```

With database add-on:

```sh
bun run add db
bun install
export DATABASE_URL=postgresql://postgres@localhost/my_app
bun run db:generate
bun run db:migrate
```

Use `PG_BOOTSTRAP_URL` plus `DATABASE_NAME` instead of `DATABASE_URL` only when
Wafer has written a real project database name.

With example feature pattern:

```sh
bun run add db
bun run add example-feature
bun install
export DATABASE_URL=postgresql://postgres@localhost/my_app
bun run db:migrate
bun run dev
```

Then open `/todos`. This route is example wiring for agents to study or replace.

With Clerk auth:

```sh
bun run setup:auth
```

Clerk is an external auth provider. It sends sign-in emails/codes, stores user sessions, and keeps
the app from having to build its own login system. The setup command installs the
`auth-clerk` add-on if needed, runs `bun install`, asks you to sign into Clerk in your browser,
creates and connects a Clerk auth project for this app, configures Wafer's default email-code auth
model, pulls Clerk env into `.env.local`, writes matching route env defaults for Clerk conventions,
runs `clerk doctor`, and verifies the app. The app route paths live in `src/app/auth.ts`. Wafer
runtime images include Clerk CLI; on a local machine, install it once with `bun add -g clerk` if the
command is missing.

Use this only when reusing an existing Clerk app:

```sh
bun run setup:auth -- --app app_xxx
```

## Deploying with wafer-deploy

From the scaffolded app directory:

```sh
wafer-deploy
```

`wafer-deploy` will pick up the package scripts automatically. The app exposes `/health`, so Wafer can infer a health check path without extra flags.
