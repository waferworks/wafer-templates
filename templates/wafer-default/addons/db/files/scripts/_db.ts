import { spawn } from "node:child_process";

import { ensureDatabaseReady, requireDatabaseUrl } from "../src/server/db/bootstrap";

type EnvShape = Record<string, string | undefined>;

export async function requirePreparedDatabaseUrl(env: EnvShape = process.env) {
  const databaseUrl = await ensureDatabaseReady(env);
  return requireDatabaseUrl({
    ...env,
    DATABASE_URL: databaseUrl ?? env.DATABASE_URL,
  });
}

export async function runScript(scriptName: string, env: EnvShape = process.env) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", scriptName], {
      env: env as NodeJS.ProcessEnv,
      stdio: "inherit",
    });

    const forwardSignal = (signal: NodeJS.Signals) => {
      child.kill(signal);
    };

    process.once("SIGINT", forwardSignal);
    process.once("SIGTERM", forwardSignal);

    child.once("error", reject);
    child.once("exit", (code) => {
      process.removeListener("SIGINT", forwardSignal);
      process.removeListener("SIGTERM", forwardSignal);

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? 1}`));
    });
  });
}
