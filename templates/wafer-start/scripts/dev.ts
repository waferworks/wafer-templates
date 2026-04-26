import { prepareDatabaseEnv, runScript } from "./_shared";

await runScript("_dev:app", await prepareDatabaseEnv({ migrate: true }, process.env));
