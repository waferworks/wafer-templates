# wafer-start

A Wafer-ready TanStack Start starter for single-app products that need a public landing page now and a cleaner path to other hosts later.

This starter ships with an opinionated, optional Clerk auth path. The app still boots with no auth keys, but once you decide you want auth, the route tree, provider wiring, and single hosted auth page are already scaffolded.

## Scaffold

```sh
bunx degit waferworks/wafer-templates/templates/wafer-start my-app
```

## Stack

- TanStack Start + Nitro for the app runtime
- React + TanStack Router file-based routes
- Optional Clerk auth scaffold for the `/app` product surface
- App-owned `users` plus `auth_identities` persistence for provider-neutral identity mapping
- Route loaders for page reads
- Server functions for mutations and reusable server-side actions
- Drizzle + Postgres for persistence
- Zod for shared contracts
- Tailwind v4 and lightweight UI primitives

## File tree

- `src/routes/`: file-based page routes and server handlers
- `src/app/site.ts`: starter-wide name, description, and title helpers
- `src/app/auth.ts`: starter-owned auth routes and redirect defaults
- `src/env/`: typed environment parsing for server runtime behavior
- `src/server/functions/`: TanStack Start server functions
- `src/server/runtime.ts`: service composition root
- `src/server/services/`: reusable server-side business logic
- `src/server/db/`: schema, bootstrap, connection, and repositories
- `src/shared/`: shared Zod schemas and derived types
- `src/components/`: reusable UI and form components
- `tests/`: starter tests and fixtures

## Common changes

- Add a page: `src/routes/<page>.tsx`
- Add a nested app page: `src/routes/app.<page>.tsx`
- Turn on auth: set Clerk keys in `.env`, then use the scaffolded `/sign-in` route
- Extend the app user model: `src/server/db/schema.ts`, `src/server/db/user-repository.ts`, `src/server/services/user-service.ts`
- Add a landing-page section: `src/routes/index.tsx`
- Add an app page read: route loader in `src/routes/<page>.tsx`, read helper in `src/server/functions/`
- Add a mutation: `src/shared/schemas.ts`, `src/server/functions/`, `src/server/services/`, `src/server/db/`
- Add a server route or webhook: `src/routes/<path>.tsx` using `server.handlers`
- Add a DB-backed feature: `src/server/db/`, `src/server/services/`, `src/server/functions/`, `src/shared/schemas.ts`, `drizzle/`

## Database modes

This template supports two modes:

- direct mode with `DATABASE_URL`
- Wafer bootstrap mode with `PG_BOOTSTRAP_URL` plus `DATABASE_NAME`

Precedence is explicit:

- if `DATABASE_URL` exists, use it directly
- else if `PG_BOOTSTRAP_URL` and `DATABASE_NAME` exist, bootstrap the app database
- else the app starts in degraded mode and `/health` returns `503`

If bootstrap mode is configured, `bun run dev` creates the app database if it does not exist, applies migrations, and then starts the app. `bun run start` is more conservative: it preserves the full runtime env, ensures the bootstrap database exists, and expects schema changes to be applied separately with `bun run db:migrate`.

## Data boundaries

- Route loaders are the default read path for page data.
- Server functions are the default mutation and server-action path.
- `server.handlers` in route files are for external HTTP surfaces like `/health`, webhooks, and callbacks.
- New shared services should be composed in `src/server/runtime.ts`, then reused from server functions and route handlers.
- `src/env/server.ts` owns the server env contract. Prefer extending that file instead of adding new ad hoc `process.env` reads.

## Local workflow

```sh
bun install
bun run db:generate
bun run db:migrate
bun run dev
bun run check
bun run smoke
bun run check:db
```

`bun run db:push` is available as a fast local sync tool, but committed migrations are the default workflow.
Use `dev` and `start` as the real entry points. `dev` can auto-apply migrations for local work; `start` does not. Scripts prefixed with `_` are internal wrappers and intentionally bypass the Wafer bootstrap path. On non-Wafer hosts, set `HOST=0.0.0.0` if the platform expects the app to bind all interfaces.

## Optional Clerk auth

This starter treats Clerk as the default auth path when you want authentication, but it does not force auth on day one.

- Without Clerk keys, `/` and `/app` both stay available so you can evaluate or prototype the starter immediately.
- Once `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set, the starter turns on the Clerk provider and middleware automatically.
- `/sign-in` is already scaffolded with Clerk’s prebuilt auth component.
- The `/app` subtree becomes the default protected surface. The public landing page at `/` stays public.
- When a database is configured, the authenticated `/app` path also provisions or reuses an app-owned user row and stores the provider linkage in `auth_identities`.

Recommended local setup:

```sh
cp .env.example .env
```

Then set these values:

```sh
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
```

After that, run:

```sh
bun run dev
```

Expected behavior:

- `/` stays public
- `/sign-in` renders the hosted auth UI
- `/app` redirects signed-out users to `/sign-in`
- `/app` renders normally for signed-in users
- signed-in requests can map the provider identity into an app-owned `users.id`

If you want an AI agent to finish the auth setup, Clerk also publishes AI-oriented tooling, including Skills and an MCP server, in addition to the normal dashboard and CLI workflow. This starter’s route names and env defaults are chosen to match that opinionated path instead of leaving auth structure unspecified.

## App-owned user model

This starter keeps the durable user model inside the app instead of treating the auth provider user ID as the only identity.

- `users` is the app-owned table. Use `users.id` for internal relationships.
- `auth_identities` maps external identities such as Clerk users onto `users.id`.
- `src/server/functions/auth.ts` is the auth boundary. It translates the current provider session into a provider-neutral identity input, then calls `src/server/services/user-service.ts`.
- `src/server/db/user-repository.ts` owns the `ensureIdentityUser()` provisioning path.

That split lets the starter ship with Clerk as the first adapter without locking the rest of the app to Clerk-specific identifiers. If you change providers later, the app’s internal tables can keep using `users.id`.

## Routing

This template uses TanStack Start's file-based routing. `src/routeTree.gen.ts` is generated by the build and should not be edited by hand.

Examples in this starter:

- `src/routes/app.tsx`: shared `/app` shell
- `src/routes/app.index.tsx`: nested loader-backed app index page
- `src/routes/app.settings.tsx`: second nested loader example
- `src/routes/sign-in.$.tsx`: hosted auth page
- `src/components/default-not-found.tsx`: router-level 404 screen
- `src/components/default-catch-boundary.tsx`: router-level error fallback
- `src/server/runtime.ts`: composition root for shared services

The `/app` example keeps loader data as the source of truth. After a successful mutation, it invalidates the router so the route loader refetches instead of keeping a second client-managed todo list.

With Clerk enabled, `src/routes/app.tsx` also becomes the starter’s default auth boundary by calling the server-side auth helper in `src/server/functions/auth.ts`.

## Metadata and starter polish

- `src/app/site.ts` defines the starter name, default description, and page-title helper.
- `src/routes/__root.tsx` owns the document shell and links the placeholder favicon at `public/favicon.svg`.
- `src/styles/app.css` defines the baseline CSS tokens used by cards, buttons, and inputs.
- Unknown routes render a starter-owned 404 screen instead of the generic router fallback.
- Route errors render generic recovery UI instead of exposing raw exception text.

## Deploying with wafer-deploy

From the scaffolded app directory:

```sh
wafer-deploy
```

The app exposes `/health`, so Wafer can infer a health check path without extra flags.
