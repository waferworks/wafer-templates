# Scaffold waferworks/wafer-templates with a default-web template

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

No `PLANS.md` file is checked into this repository today. This document must still be maintained using the same living-document rules described by the `execplan` skill.

## Purpose / Big Picture

After this work, `waferworks/wafer-templates` will contain a public `default-web` starter that can be copied with `bunx degit waferworks/wafer-templates/templates/default-web my-app`. A fresh scaffold will include a Wafer-friendly Bun + Hono + Vite + React + Drizzle stack, expose `/health`, and show a working todo flow that reads and writes Postgres through `DATABASE_URL`.

The visible proof is straightforward: the repository root will document the template, `templates/default-web` will install cleanly, `bun run build` and `bun run test` will pass, and starting the app on a wafer-compatible port will expose both the HTML app and the API from `127.0.0.1:$PORT`.

## Progress

- [x] (2026-04-17 20:22Z) Pulled WAF-138 from Linear and extracted the required repository layout, scripts, Wafer constraints, and acceptance criteria.
- [x] (2026-04-17 20:22Z) Confirmed this worktree is effectively empty apart from the initial git metadata, so the repo must be scaffolded from zero.
- [x] (2026-04-17 20:31Z) Created the repo-level files: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `.gitignore`, and `.github/workflows/ci.yml`.
- [x] (2026-04-17 20:31Z) Created `templates/default-web` with package metadata, config files, server code, client code, shared schemas, tests, and per-template documentation.
- [x] (2026-04-17 20:49Z) Installed dependencies, generated `templates/default-web/bun.lock`, and verified `bun run lint`, `bun run build`, and `bun run test`.
- [ ] `bun run db:push` remains blocked because this shell session does not expose `DATABASE_URL`.
- [ ] Create or attach the GitHub remote if the environment permits it, then push the repo so `bunx degit waferworks/wafer-templates/templates/default-web ...` can be verified against GitHub instead of only the local tree.

## Surprises & Discoveries

- Observation: the target repository has no checked-out files yet, only a single initial commit and no remote.
  Evidence: `git log --oneline --max-count=1` returned `23d11a8 Initial commit`, while `ls -la` in the repo root showed only `.git`.

- Observation: Wafer deploy auto-detects JavaScript runtimes from `package.json` scripts named `start`, `dev`, or `serve`, preferring `start`.
  Evidence: `wafer-runtime/worker-supervisor/internal/deploytool/deploytool.go` checks those script names in that order.

- Observation: Vite outputs the built HTML to `dist/client/public/index.html` when the HTML entry point is `public/index.html`.
  Evidence: `bun run build` produced `dist/client/public/index.html`, so the production server was updated to serve that path.

- Observation: Hono RPC typing collapses to `unknown` if a route instance is created first and then mutated without exporting the chained return value.
  Evidence: TypeScript reported `'client' is of type 'unknown'` until both `buildApp()` and `todosRoute` returned chained Hono instances rather than the originally declared variable.

## Decision Log

- Decision: Add a `start` script even though the issue only mandates `dev`, `build`, `preview`, `lint`, `format`, `test`, and `db:push`.
  Rationale: Wafer deploy prefers `start`, so adding it makes a scaffolded app deploy more predictably without changing the required script set.
  Date/Author: 2026-04-17 / Codex

- Decision: Use a single-port server that embeds Vite middleware during development and serves built assets in production.
  Rationale: Wafer provides one assigned port. A unified server keeps the example compatible with Wafer while still giving a normal Vite-powered development workflow.
  Date/Author: 2026-04-17 / Codex

- Decision: Use a repository abstraction for todos with both Postgres-backed and in-memory-unavailable implementations.
  Rationale: Public behavior tests should exercise stable interfaces without requiring a live database for every `bun test` run, while the running app still uses `DATABASE_URL` when available.
  Date/Author: 2026-04-17 / Codex

## Outcomes & Retrospective

The local scaffold is complete and the public behavior is verified without hand-waving. `bun run lint`, `bun run build`, and `bun run test` pass in `templates/default-web`. Running the app in both dev mode and preview mode on explicit loopback ports returns the browser app on `/` and a `503` JSON health response on `/health` when no `DATABASE_URL` is present, which is the expected degraded behavior for this shell.

The remaining gap is environmental, not implementation-specific: this shell does not expose `DATABASE_URL`, so `db:push` cannot be proven here, and the GitHub repository still needs to be created and pushed before the public `degit` command can be validated end to end.

## Context and Orientation

This repository is being created from scratch to back the `default-stack` skill in the main `waferworks/wafer` repository. That skill already instructs agents to run `bunx degit waferworks/wafer-templates/templates/default-web my-app`, so the repository must exist with that exact `templates/default-web` path and a self-contained starter app.

The template itself is a small full-stack TypeScript app. The server lives in `templates/default-web/src/server/`. It uses Hono, which is a typed HTTP framework built around the Fetch API. The browser app lives in `templates/default-web/src/client/` and uses React plus TanStack Router and TanStack Query. The database schema lives in `templates/default-web/src/server/db/schema.ts`, and both the server and client share request/response contracts from `templates/default-web/src/shared/schemas.ts`.

Wafer-specific behavior matters more than framework fashion. The app must bind only to `127.0.0.1` and to the port in `process.env.PORT`. It must read Postgres connection details only from `process.env.DATABASE_URL`. It must expose `/health` so `wafer-deploy` can auto-detect a health check path. The repository must not introduce Docker or process managers because Wafer is already the runtime and supervisor.

## Plan of Work

First, create the repo-level files so the repository is intelligible and CI can validate every template directory. The root `README.md` will list templates in a parseable format, `CONTRIBUTING.md` will explain how to propose additional templates, `.gitignore` will ignore generated artifacts, `LICENSE` will be MIT, and `.github/workflows/ci.yml` will iterate through `templates/*` and run each template’s install, lint, build, and test commands.

Next, create `templates/default-web/package.json`, `tsconfig.json`, `biome.json`, `vite.config.ts`, `drizzle.config.ts`, `.gitignore`, and `.env.example`. These files will encode the stack and the Wafer runtime assumptions. `vite.config.ts` will pin `127.0.0.1` and `PORT`, and `drizzle.config.ts` will read `DATABASE_URL`.

Then implement the server in `templates/default-web/src/server/index.ts`, `routes/todos.ts`, and `db/client.ts`. The server will export the Hono app type for typed RPC, expose `/api/todos`, and gate `/health` on database reachability. In development it will run a custom Node HTTP server that forwards API requests to Hono and browser requests to Vite middleware. In production it will serve `dist/client` when present.

After the server exists, implement the client in `templates/default-web/src/client/main.tsx`, `routes/__root.tsx`, `routes/index.tsx`, `api.ts`, `components/todo-form.tsx`, and small shadcn-style UI primitives under `components/ui/`. The browser app will fetch and create todos through typed Hono RPC helpers, validate forms with React Hook Form and Zod, and render a visually intentional default page instead of a blank scaffold.

Finally, add tests in `templates/default-web/tests/` that hit the Hono app through public routes and verify host/port logic. Once the files are in place, run `bun install` to generate `bun.lock`, then run lint, build, test, and `db:push` if the environment exposes `DATABASE_URL`. If GitHub access is available, create or attach the repository remote and push so the published `degit` command can be exercised against GitHub.

## Concrete Steps

From the repository root:

    mkdir -p docs/plans .github/workflows templates/default-web/...

Create the root files and the template files listed above.

Inside `templates/default-web`:

    bun install
    bun run lint
    bun run build
    bun run test

If `DATABASE_URL` is present:

    bun run db:push

If GitHub publishing is available:

    gh repo create waferworks/wafer-templates --public --source=. --remote=origin --push

Observed proof after implementation:

    bun run test
    # bun reports 3 passing tests and 0 failures.

    PORT=3000 DATABASE_URL=postgres://... bun run dev
    # Visiting /health returns HTTP 200 after Postgres is reachable.
    # Visiting / shows the todo page.

    PORT=4011 bun run preview
    curl -i http://127.0.0.1:4011/
    curl -i http://127.0.0.1:4011/health
    # / returns HTML 200 and /health returns 503 without DATABASE_URL.

## Validation and Acceptance

Validation is behavior-focused:

`templates/default-web` includes the required files and scripts. `bun run lint`, `bun run build`, and `bun run test` all succeeded from `templates/default-web` on 2026-04-17. The test suite proves that `POST /api/todos` creates a todo, `GET /api/todos` returns it, `/health` returns `503` when the repository reports no database connection, and `/health` returns `200` when the repository reports success.

If `DATABASE_URL` is present, `bun run db:push` must succeed without editing the config. If GitHub publication is possible, the final verification should include scaffolding the template into a fresh directory with `bunx degit waferworks/wafer-templates/templates/default-web scratch`, followed by `bun install`, `bun run build`, and `bun run test` inside `scratch`.

## Idempotence and Recovery

All file creation steps are additive and safe to repeat. Re-running `bun install` updates `bun.lock` but should not damage source files. Re-running `bun run build` overwrites `dist/`, which is ignored by git. Re-running `bun run db:push` is safe as long as the schema changes are the intended state of the current database. If GitHub publication fails, the local repository should still remain valid and testable.

## Artifacts and Notes

Important source references gathered before implementation:

    WAF-138 states the template must bind to 127.0.0.1 + process.env.PORT, use DATABASE_URL, expose /health, and avoid Docker/PM2.

    wafer-runtime/worker-supervisor/internal/deploytool/deploytool.go prefers package scripts named start, dev, or serve when deploying JavaScript projects.

## Interfaces and Dependencies

At the end of this work, these interfaces must exist:

In `templates/default-web/src/shared/schemas.ts`, define Zod schemas and TypeScript types for:

    createTodoInputSchema
    todoSchema
    todoListResponseSchema
    todoResponseSchema

In `templates/default-web/src/server/db/client.ts`, define:

    export interface TodoRepository {
      list(): Promise<Todo[]>;
      create(input: CreateTodoInput): Promise<Todo>;
      healthCheck(): Promise<boolean>;
      close(): Promise<void>;
    }

In `templates/default-web/src/server/index.ts`, define and export:

    export interface AppBindings
    export function buildApp(todoRepository?: TodoRepository): Hono<AppBindings>
    export function getServerConfig(): { host: "127.0.0.1"; port: number }
    export type AppType = typeof app

These names make the API testable, keep the typed Hono RPC client stable, and ensure the server’s Wafer constraints are explicit instead of being buried in inline code.

Change log:

- 2026-04-17: Created the initial execution plan from WAF-138 and local repository inspection so the scaffold can be implemented from a blank repo.
- 2026-04-17: Updated progress, verification evidence, and implementation discoveries after the template scaffold passed local lint, build, test, and runtime checks.
