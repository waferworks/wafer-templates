# db add-on

Adds Drizzle and Postgres plumbing to `wafer-default`.

Install:

    bun run add db
    bun install

Set `DATABASE_URL`, or set both `PG_BOOTSTRAP_URL` and `DATABASE_NAME`, before running migrations
or database-backed features. Keep bootstrap lines commented in examples until Wafer writes the real
project database name.

This add-on provides neutral database plumbing. Feature add-ons, such as `example-feature`, provide their own
schema and migration files.
