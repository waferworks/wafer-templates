# wafer-templates

Starter templates for Wafer projects.

## Templates

- `default-web`: Full-stack Bun + Hono + Vite + React + Drizzle starter for a standard Wafer app.
  Scaffold: `bunx degit waferworks/wafer-templates/templates/default-web my-app`

## Repository shape

Each template lives under `templates/<name>/` and is designed to be copied directly into a new app directory with `degit`.

## Validation

CI installs, lints, builds, and tests every template directory on pushes and pull requests.
