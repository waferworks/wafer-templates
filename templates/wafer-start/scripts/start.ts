import { prepareDatabaseEnv, runScript } from "./_shared";

await runScript("_start:app", await prepareDatabaseEnv({ migrate: false }, process.env));
