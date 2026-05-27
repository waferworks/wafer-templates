import { migrateDatabase } from "../src/server/db/bootstrap";

import { requirePreparedDatabaseUrl } from "./_db";

await migrateDatabase(await requirePreparedDatabaseUrl());
