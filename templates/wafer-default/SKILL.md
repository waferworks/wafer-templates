---
name: default-stack
description: Default Wafer new-project workflow. Use the wafer-default template, keep projects under /data/workspace/<project-folder>, install optional add-ons only when needed, and allow explicit template selection.
---

# Default Project Template

When starting a new app, use a Wafer template. Do not hand-scaffold a project
from scratch unless the user explicitly asks you to avoid templates or the
template cannot be fetched.

Use `wafer-default` by default. It is intentionally small: Bun, Hono, Vite,
React, Tailwind v4, code-based TanStack Router, health checks, and an add-on
installer. It does not include database, example feature, or auth code until the
app needs those capabilities.

## Create A New Project

The workspace root is not an app project. Never create app files directly in
`/data/workspace`. Every app must live in its own folder:

```text
/data/workspace/<project-folder>/
```

Before writing files like `package.json`, `src/`, `vite.config.ts`, or app code,
create the project folder through the template command and `cd` into it. Say:

```text
I'm working in /data/workspace/<project-folder>.
```

Templates live at
[github.com/waferworks/wafer-templates](https://github.com/waferworks/wafer-templates).
Use `degit` to pull one template directory into the current workspace; it copies
the template without `.git` history.

Default new app:

```bash
bunx degit waferworks/wafer-templates/templates/wafer-default my-app
cd my-app
bun install
wafer-project init
```

After scaffold, choose add-ons from the user's actual request. Do not install DB,
example feature, or auth by default.

## Add-On Decision Tree

- Static site, landing page, docs page, portfolio, or simple client app: stay in
  the base template and edit `src/client/routes/`.
- Server API without persistence: stay in the base template, add a Hono route
  under `src/server/routes/`, mount it in `src/server/app.ts`, and add shared
  schemas only if validation is needed.
- Database, persistence, saved records, CRUD, admin data, or Postgres: run
  `bun run add db`, then `bun install`, then add schema, repository, service,
  route, and tests. Use `DATABASE_URL`, or both `PG_BOOTSTRAP_URL` and
  `DATABASE_NAME`, before migrations.
- A concrete database-backed example or a pattern to copy from: run
  `bun run add db`, then `bun run add example-feature`, then `bun install`.
  The example route is `/todos`; treat it as reference wiring, not product code
  every app must keep.
- Login, sign-in, sign-out, accounts, users, members, private pages, roles,
  teams, invitations, subscriptions, or billing per user: run `bun run
  setup:auth` from the project root.
- Persisted app users or user-owned records: install both `db` and Clerk auth.
  Use an app-owned `users.id` for internal relationships. Do not key app data
  directly off the provider user id.

## Auth Setup

When the user needs auth, use the template's Clerk setup command:

```bash
bun run setup:auth
```

Explain Clerk simply when needed:

```text
Clerk is an external auth provider. It sends sign-in emails/codes and keeps
users signed in, so the app does not have to build its own login system.
```

Do not ask for Clerk dashboard keys. The user should only need to sign into
Clerk in the browser. The setup command installs the `auth-clerk` add-on if
needed, runs `bun install`, starts Clerk CLI browser login, creates and links
the Clerk auth project, configures Wafer's email-code auth default, pulls
`.env.local`, runs `clerk doctor`, and verifies the app.

Keep the default auth model:

- one `/sign-in` surface for new and returning users
- public email-code sign-in/sign-up
- no username
- no phone auth
- no password auth

Manual dashboard key copy is only a fallback when Clerk CLI cannot create, link,
pull env, or patch config. If the user already has a Clerk app id, the advanced
fallback is:

```bash
bun run setup:auth -- --app app_xxx
```

## Template Selection

If the user names a template, replace `wafer-default` with that template name
under `waferworks/wafer-templates/templates/<template-name>`.

Use the named template only when the user asks for it. If they ask vaguely for
"an app" or "something new", use `wafer-default`. List available templates by
browsing `templates/` in the repo.

If a named template cannot be fetched or does not exist, stop and explain the
template problem. Do not silently substitute a different named template.

## Fallback When `wafer-default` Is Unavailable

Use this section only when the default `wafer-default` template cannot be
fetched because the template repo, network, or package runner is unavailable.
Mention the template access problem briefly, then scaffold the project in
`/data/workspace/<project-folder>` using this baseline.

Default base stack:

- Runtime: Bun
- Server: Hono, one Node HTTP process, `/health`, `/healthz`, and `/api`
- Client: Vite, React, Tailwind v4, code-based TanStack Router
- UI: small shadcn/Base UI set, `class-variance-authority`, `clsx`,
  `tailwind-merge`, Phosphor Icons
- Tooling: TypeScript, Biome, `bun run test`
- Database: absent until a DB add-on is installed
- Auth: absent until `bun run setup:auth` installs Clerk

Expected base scripts:

```json
{
  "dev": "NODE_ENV=development bun run src/server/index.ts",
  "start": "NODE_ENV=production bun run src/server/index.ts",
  "build": "vite build && tsc --noEmit",
  "add": "bun run ./scripts/add.ts",
  "setup:auth": "bun run ./scripts/setup-auth.ts",
  "lint": "biome check .",
  "format": "biome format --write .",
  "test": "bun test tests --timeout 30000",
  "smoke": "bun run ./scripts/smoke.ts",
  "check": "bun run lint && bun run build && bun run test",
  "check:base": "bun run lint && bun run build && bun run test && bun run smoke",
  "check:addons": "bun run ./scripts/check-addons.ts"
}
```

Expected base layout:

```text
src/
  app/
    site.ts
  client/
    main.tsx
    api.ts
    routes/
      __root.tsx
      index.tsx
    components/
      default-catch-boundary.tsx
      default-not-found.tsx
      ui/*
    lib/
      utils.ts
  env/
    server.ts
  server/
    app.ts
    errors.ts
    health.ts
    index.ts
    start.ts
    static.ts
    routes/              added when API features need them
    services/            added when application behavior needs them
    db/                  added only after `bun run add db`
  shared/
    schemas.ts
public/
addons/
scripts/
tests/
```

Expected add-ons:

- `db`: Drizzle, Postgres connection code, Drizzle config, and `db:*` scripts.
- `example-feature`: a DB-backed todos feature used as a concrete pattern.
  Requires `db`.
- `auth-clerk`: Clerk client/server auth scaffolding at `/sign-in` and
  `/api/auth/session`. Prefer `bun run setup:auth` over direct add-on install.

## Project Conventions

Keep one path for API data flow:

```text
route component -> client API helper -> Hono route -> service -> repository
```

Put shared request and response contracts in `src/shared/` first, then consume
them on both sides. Do not put server-only code in `src/shared/`.

Use add-ons instead of manually copying optional stacks:

```bash
bun run add <needed-addon>
bun install
```

Do not:

- add database or auth dependencies to the base package unless they are part of
  an add-on manifest
- manually copy files out of `addons/`
- put optional product surfaces like `/todos`, `/sign-in`, dashboards, or demo
  CRUD in the base app
- generate file-based TanStack Router config for this template
- edit project files before entering `/data/workspace/<project-folder>`
- point an app database at Wafer's system database

## After Creating The Project

1. Run `bun install` if it has not already run.
2. Run `wafer-project init` to create project metadata, Git, and any Wafer
   project-local environment expected by installed capabilities.
3. Add only the capabilities the user requested.
4. Run the narrow verification for what changed:
   - base/client/server changes: `bun run lint`, `bun run build`,
     `bun run test`
   - server startup/routing changes: also run `bun run smoke`
   - add-on changes: also run `bun run check:addons`
5. Save or commit according to the current agent workflow. `wafer-project init`
   may already create the initial commit when the repo has no commits.
6. Start local development with `bun run dev` when the user needs to preview the
   app.
7. Deploy with `wafer-deploy` when the user asks to deploy.

## Adding To An Existing Project

If the repo already has files, read them first and match the existing project.
Do not rewrite an existing project to fit `wafer-default` unless the user asks.

For existing apps that need auth, prefer `bun run setup:auth` if this is a
`wafer-default` project. If the app is not `wafer-default`, inspect the actual
framework and use Clerk CLI agent mode for framework-specific guidance before
patching only the missing integration pieces.
