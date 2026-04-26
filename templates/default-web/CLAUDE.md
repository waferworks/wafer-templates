# default-web agent runbook

This file is the working guide for agents changing this template or apps scaffolded from it.

## System map

- Browser UI lives in `src/client/`.
- Browser code reaches the server through `src/client/api.ts`.
- Hono routes in `src/server/routes/` are the HTTP surface only.
- Reusable server-side behavior belongs in `src/server/services/`.
- Database access belongs in `src/server/db/`.
- `src/client/main.tsx` owns route registration. This template uses code-based TanStack Router wiring, not generated file-based routing.
- `src/client/routes/__root.tsx` owns the shared shell. Change it when app-wide layout, nav, or starter copy needs to move.
- Shared request and response contracts live in `src/shared/`.
- `tests/` holds Hono-surface behavior tests and shared test fixtures.

## File map

- `src/client/routes/`: route components
- `src/client/components/`: reusable UI and form components
- `src/client/api.ts`: browser-side API helpers
- `src/server/routes/`: Hono route modules
- `src/server/services/`: server-side business logic
- `src/server/db/`: schema, connection, repositories
- `src/shared/schemas.ts`: shared Zod schemas and derived types
- `tests/`: Hono-surface tests
- `tests/support/`: test fixtures and in-memory repos

## Naming

- Route files use noun-based names by resource or page.
- Client API helpers are verb-first and return parsed typed data.
- Shared schemas use names like `thingSchema`, `thingResponseSchema`, and `thingInputSchema`.
- Services use `<resource>-service.ts`.
- Repositories use `src/server/db/<resource>-repository.ts`.

## Flow

Keep one path for data flow:

`route component -> client API helper -> Hono route -> service -> repository`

Put shared request and response contracts in `src/shared/` first, then consume them on both sides.

## Common tasks

### Add a page

Files to touch:
- `src/client/routes/<page>.tsx`
- `src/client/main.tsx`
- `src/client/api.ts` if the page loads or mutates data
- `tests/` if visible behavior changes

Example:
- `src/client/routes/index.tsx`

### Add an API route

Files to touch:
- `src/shared/schemas.ts`
- `src/server/routes/<resource>.ts`
- `src/server/services/<resource>-service.ts` if logic is not trivial
- `src/server/index.ts` to extend `AppBindings.Variables`, register the service, and mount the route
- `src/client/api.ts`
- `tests/`

Examples:
- `src/server/routes/todos.ts`
- `src/client/api.ts`

### Add a database-backed feature

Files to touch:
- `src/server/db/schema.ts`
- `src/server/db/<resource>-repository.ts`
- `src/server/services/<resource>-service.ts`
- `src/server/index.ts` if the service is injected through Hono context
- `src/shared/schemas.ts`
- `tests/`
- `drizzle/` via `bun run db:generate`

Examples:
- `src/server/db/schema.ts`
- `src/server/db/todo-repository.ts`
- `src/server/services/todo-service.ts`

### Add a form

Files to touch:
- `src/shared/schemas.ts`
- `src/client/components/<thing>-form.tsx`
- `src/client/api.ts`
- the owning route in `src/client/routes/`
- the server route in `src/server/routes/`

Example:
- `src/client/components/todo-form.tsx`

### Add tests

Files to touch:
- `tests/*.test.ts`
- `tests/support/*` if you need fixtures

Use Hono-surface tests by default. This template does not ship a separate client-component test stack.

## Rules

- Keep HTTP routes thin.
- Keep repositories focused on persistence.
- Keep services focused on application behavior.
- Prefer extending existing patterns over introducing a second way to do the same thing.

## Avoid

- Do not fetch directly from route components when the request belongs in `src/client/api.ts`.
- Do not put database access in React components.
- Do not create a second API pattern beside Hono routes plus `src/client/api.ts`.
- Do not put server-only code in `src/shared/`.
- Do not bypass Zod validation when data crosses the client/server boundary.
- Do not generate file-based TanStack Router config in this template.

## Done

- Update shared schemas if the request or response contract changed.
- Update the client API helper if the route contract changed.
- Add or update a test for the user-visible behavior.
- Generate and commit a migration if the database schema changed.
- Run `bun run check`.
- Run `bun run smoke` when server behavior, routing, or boot flow changed.

## Verification

Run these commands from the project root:

```sh
bun run lint
bun run build
bun run test
bun run smoke
bun run db:generate
bun run db:migrate
```

Or use:

```sh
bun run check
```
