# wafer-templates

Starter templates for Wafer projects.

## Templates

- `wafer-default`: Lightweight Bun + Hono + Vite + React starter for a standard Wafer app.
  Scaffold: `bunx degit waferworks/wafer-templates/templates/wafer-default my-app`
- `wafer-start`: TanStack Start + Drizzle starter for a Wafer app that wants a cleaner path to other hosts later.
  Scaffold: `bunx degit waferworks/wafer-templates/templates/wafer-start my-app`

## Repository shape

Each template lives under `templates/<name>/` and is designed to be copied directly into a new app directory with `degit`.

Every template with a `package.json` must include `bunfig.toml` so Bun waits seven days before installing newly released package versions:

```toml
[install]
minimumReleaseAge = 604800
```

## Validation

CI verifies every template has the Bun release-age policy, then runs `bun install --minimum-release-age 604800`, `bun run lint`, `bun run build`, `bun run test`, and `bun run smoke` inside each template directory. `wafer-default` also runs `bun run check:addons`; `wafer-start` also verifies Drizzle output plus direct and bootstrap database smoke checks.
