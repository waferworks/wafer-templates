# Contributing

New templates belong in `templates/<name>/`.

Every template contribution must include:

- A dedicated `README.md` inside the template directory.
- A committed lockfile if the template uses a package manager.
- A working `lint`, `build`, and `test` command.
- Any Wafer-specific runtime assumptions called out explicitly in the template README.

Before opening a pull request, run the template checks from inside the template directory:

```sh
bun install
bun run lint
bun run build
bun run test
```

If the template uses Drizzle and your environment provides `DATABASE_URL`, also run:

```sh
bun run db:push
```
