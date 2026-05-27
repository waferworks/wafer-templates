# wafer-default agent runbook

This file is the working guide for agents changing this template or apps scaffolded from it. `AGENTS.md` is a symlink to this file.

## System Map

- Browser UI lives in `src/client/`.
- UI primitives live in `src/client/components/ui/` and follow the shadcn/Base UI preset in `components.json`.
- The Hono app composition lives in `src/server/app.ts`; startup lives in `src/server/start.ts`; static serving lives in `src/server/static.ts`.
- Base health checks live at `/health` and `/healthz`.
- The base API placeholder lives at `/api`.
- Add-on hook markers live in `src/server/app.ts` and `src/client/main.tsx`.
- `src/client/main.tsx` owns route registration. This template uses code-based TanStack Router wiring, not generated file-based routing.
- Shared request and response contracts live in `src/shared/` only when a feature or add-on needs them.
- Optional database, example feature, and Clerk auth scaffolding lives in `addons/`.
- `tests/` holds base behavior tests and add-on installer tests.

## Base Shape

The base is intentionally light: Vite, React, Hono, Tailwind, and route registration. It does not include Drizzle, Postgres, example feature behavior, React Query, React Hook Form, Zod, or Clerk until an add-on is installed.

The base includes a small shadcn/Base UI design system from preset `b1Vo9kCe`. Keep it curated: add new shadcn components only when a feature needs them, and use `--base base` so future components match the template.

Use add-ons instead of manually copying optional stacks. Install only what the app needs:

```sh
bun run add <needed-addon>
bun install
```

## File Map

- `src/client/routes/`: route components
- `src/client/components/`: reusable UI components
- `src/client/components/ui/`: shadcn/Base UI primitives owned by the app
- `src/client/api.ts`: browser-side API helpers when a feature needs them
- `src/server/app.ts`: Hono app, middleware, routes, cleanup registration, and server add-on hook markers
- `src/server/start.ts`: host/port config, HTTP server startup, shutdown, and request conversion
- `src/server/static.ts`: Vite middleware and production asset serving
- `src/server/index.ts`: tiny executable entrypoint and public server re-exports
- `src/server/routes/`: Hono route modules after an API feature is added
- `src/server/services/`: server-side business logic after a feature is added
- `src/server/db/`: database code after `bun run add db`
- `src/shared/`: shared Zod schemas or types after a feature needs browser/server contracts
- `addons/`: installable optional capabilities
- `scripts/add.ts`: add-on installer
- `tests/`: base and installer tests
- `components.json`: shadcn configuration; aliases point at `src/client/components` and `src/client/lib`

## Add-ons

### db

Install with:

```sh
bun run add db
bun install
```

Adds Drizzle, Postgres, `drizzle.config.ts`, database connection code, and `db:*` scripts. Set `DATABASE_URL`, or set both `PG_BOOTSTRAP_URL` and `DATABASE_NAME`, before running migrations.

### example-feature

Install with:

```sh
bun run add db
bun run add example-feature
bun install
```

Adds an example database-backed feature using todos as the concrete pattern. It installs the API, repository, service, schemas, React route, form, migrations, and tests. The route is `/todos`; the API is `/api/todos`.

### auth-clerk

Install with:

```sh
bun run setup:auth
```

Adds Clerk client/server auth scaffolding at `/sign-in` and `/api/auth/session`.
Clerk is an external auth provider that sends sign-in emails/codes, stores sessions, and avoids
custom login code. The setup command installs the add-on when needed, runs `bun install`, sends the user
through Clerk CLI browser login, creates and connects the Clerk auth project for this app, configures
Wafer's default email-code auth model, pulls `.env.local`, adds matching Wafer route defaults for
Clerk conventions, runs `clerk doctor`, and verifies the app. The app route paths live in
`src/app/auth.ts`.

For agents: do not ask the user to copy keys out of the Clerk Dashboard first. Run the setup command,
let Clerk CLI print/open the browser sign-in handoff, and wait for the user to finish login. After
that, the script creates the Clerk app, links it with `clerk link --app`, pulls env, and patches the
auth defaults. Keep the default as one `/sign-in` surface with public email-code sign-in/sign-up, no
username, no phone, and no password. Manual dashboard key copy or
`bun run setup:auth -- --app app_xxx` is only a fallback when Clerk CLI cannot create, link, pull
env, or patch config.

## Add-on Hook API

Add-ons patch stable marker comments. Treat these comments as public extension points.

Server markers in `src/server/app.ts`:

- `// addon:server-imports`: add imports needed by installed server code.
- `// addon:app-variables`: add Hono context variables.
- `// addon:app-options`: add optional `buildApp()` dependencies for tests.
- `// addon:server-services`: compose services and middleware.
- `// addon:server-routes`: mount Hono routes.

Client markers:

- `// addon:client-provider-imports`: import client-side provider packages.
- `// addon:client-auth-imports`: import auth provider components.
- `// addon:client-route-imports`: import add-on routes.
- `// addon:client-routes`: register add-on routes in the route tree.
- `// addon:client-render-wrapper`: create client-side providers before rendering.

Patch rules:

- Snippets must be idempotent. Re-running `bun run add <name>` must not duplicate code.
- Optional product routes belong in add-ons, not base.
- Base dependencies must not be added except through add-on manifests.
- Do not manually copy from `addons/`; use `bun run add <name>`.
- If a marker moves, update every affected add-on manifest and verify in a clean temporary copy.

## Visible Surface Policy

The base may include hidden infrastructure and fallback UI. It may expose `/`, `/health`, `/healthz`, and the harmless `/api` placeholder.

The base must not include optional product surfaces such as `/app`, `/todos`, `/sign-in`, dashboards, settings pages, or demo CRUD routes. Those belong in add-ons.

## Environment Modes

- Base mode has no DB or auth. It uses `HOST` and `PORT`, defaulting to `127.0.0.1:3000`.
- DB mode starts after `bun run add db`. Set `DATABASE_URL`, or set both `PG_BOOTSTRAP_URL` and `DATABASE_NAME`, before running migrations.
- Example feature mode starts after `bun run add db` and `bun run add example-feature`. It adds `/todos` and `/api/todos` as a concrete pattern.
- Clerk mode starts after `bun run setup:auth`. The command uses Clerk CLI to create/link the Clerk
  app and pull `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`; without keys, the generated
  sign-in route renders a setup message instead of crashing.

## Agent Decision Tree

- Static landing page, marketing site, docs page, or portfolio: stay in the base and edit `src/client/routes/`.
- Server API with no persistence: stay in the base, add a Hono route under `src/server/routes/`, mount it through the server route hook, and add shared schemas only if validation is needed.
- Database, persistence, saved records, CRUD, admin data, or Postgres: run `bun run add db`, run `bun install`, then add schema, repository, service, route, and tests.
- Example feature pattern: run `bun run add db`, run `bun run add example-feature`, run `bun install`, then verify `/todos` and `/api/todos`.
- Login, sign-in, sign-out, or Clerk: run `bun run setup:auth`, wait for the browser login handoff,
  then let the script create/link Clerk and verify `/sign-in` and `/api/auth/session`.
- Persisted app users or user-owned records: install `db` and `auth-clerk`, then add an app-owned `users` table with internal `users.id` relationships.

## Flow

Keep one path for data flow when API behavior exists:

`route component -> client API helper -> Hono route -> service -> repository`

Put shared request and response contracts in `src/shared/` first, then consume them on both sides. Do not put server-only code in `src/shared/`.

## Common Tasks

### Add a page

Files to touch:

- `src/client/routes/<page>.tsx`
- `src/client/main.tsx`
- `tests/` if visible behavior changes

Example:

- Create `src/client/routes/about.tsx`.
- Import `aboutRoute` in `src/client/main.tsx`.
- Add `aboutRoute` to `rootRoute.addChildren`.
- Run `bun run build`.

### Add an API route

Files to touch:

- `src/shared/` if the request or response needs validation
- `src/server/routes/<resource>.ts`
- `src/server/services/<resource>-service.ts` if logic is not trivial
- `src/server/app.ts` to mount the route
- `src/client/api.ts` if browser code calls the route
- `tests/`

Example without DB:

- Create `src/server/routes/contact.ts`.
- Validate the request body in the route or a shared schema.
- Mount the route at the server route hook.
- Add a Hono-surface test that calls `app.request("/api/contact")`.

### Add a database-backed feature

First install the DB add-on if `src/server/db/` does not exist:

```sh
bun run add db
bun install
```

Files to touch after that:

- `src/server/db/schema.ts`
- `src/server/db/<resource>-repository.ts`
- `src/server/services/<resource>-service.ts`
- `src/server/routes/<resource>.ts`
- `src/shared/`
- `tests/`
- `drizzle/` via `bun run db:generate`

Example:

- Run `bun run add db`.
- Add a `notes` table to `src/server/db/schema.ts`.
- Add `src/server/db/note-repository.ts`.
- Add `src/server/services/note-service.ts`.
- Add `src/server/routes/notes.ts`.
- Add shared schemas in `src/shared/`.
- Mount `/api/notes`.
- Run `bun run db:generate`.

### Protect a route with Clerk

First install the Clerk add-on if auth files do not exist:

```sh
bun run setup:auth
```

Then use the generated auth helpers and keep route protection on the server side for API behavior.
Do not add client-only checks for sensitive data.

### Add tests

Use Hono-surface tests by default. This template does not ship a separate client-component test stack.

## Rules

- Keep HTTP routes thin.
- Keep repositories focused on persistence.
- Keep services focused on application behavior.
- Prefer extending existing patterns over introducing a second way to do the same thing.
- Install add-ons through `bun run add <name>` instead of manually copying from `addons/`.
- Do not add database or auth dependencies to the base package unless they are part of an add-on manifest.
- Do not generate file-based TanStack Router config in this template.

## Done

- Update shared schemas if the request or response contract changed.
- Update the client API helper if the route contract changed.
- Add or update a test for user-visible behavior.
- Generate and commit a migration if the database schema changed.
- Run `bun run lint`.
- Run `bun run build`.
- Run `bun run test`.
- Run `bun run smoke` when server behavior, routing, or boot flow changed.
- For add-on work, verify the add-on in a clean temporary copy.

## Verification

Run these commands from the template root:

```sh
bun run lint
bun run build
bun run test
bun run smoke
```

For add-on changes, also verify:

```sh
bun run check:addons
```

The check script installs each supported add-on scenario in a clean temporary copy that excludes
local `node_modules`, `dist`, and `.env*` files.

To inspect one scenario manually from this template root:

```sh
tmpdir="$(mktemp -d)"
mkdir "$tmpdir/wafer-default"
rsync -a --exclude node_modules --exclude dist --exclude '.env*' ./ "$tmpdir/wafer-default/"
cd "$tmpdir/wafer-default"
bun run add db
bun run add example-feature
bun install
bun run build
bun run test
bun run smoke
```
