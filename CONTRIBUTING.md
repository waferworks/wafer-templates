# Contributing

New templates belong in `templates/<name>/`.

Every template contribution must include:

- A dedicated `README.md` inside the template directory.
- A committed lockfile if the template uses a package manager.
- A working `lint`, `build`, and `test` command.
- Any Wafer-specific runtime assumptions called out explicitly in the template README.

Before opening a pull request, run the template checks from inside each changed template directory:

```sh
bun install --minimum-release-age 604800
bun run lint
bun run build
bun run test
bun run smoke
```

CI is the source of truth for the full validation matrix. It also verifies `wafer-default`
add-on combinations and `wafer-start` database paths.
