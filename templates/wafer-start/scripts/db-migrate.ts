import { migrateDatabase } from "../src/server/db/bootstrap";

import { requirePreparedDatabaseUrl } from "./_shared";

await migrateDatabase(await requirePreparedDatabaseUrl());
