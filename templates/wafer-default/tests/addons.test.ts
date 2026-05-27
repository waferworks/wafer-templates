import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import {
  buildDatabaseUrl,
  readDatabaseEnv,
  resolveConfiguredDatabaseUrl,
  resolveDatabaseMode,
} from "../addons/db/files/src/env/database";
import { installAddon } from "../scripts/add";
import { copyTemplateSource, shouldCopyTemplatePath } from "../scripts/template-copy";

const templateRoot = path.resolve(import.meta.dir, "..");

describe("add-on installer", () => {
  test("installs db package metadata and files idempotently", async () => {
    const rootDir = await copyTemplate();
    const hadDb = await hasAddon(rootDir, "db");

    const first = await installAddon({ rootDir, addonName: "db" });
    const second = await installAddon({ rootDir, addonName: "db" });
    const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));

    if (hadDb) {
      expect([...first.copiedFiles, ...first.skippedFiles]).not.toContain("drizzle.config.ts");
    } else {
      expect([...first.copiedFiles, ...first.skippedFiles]).toContain("drizzle.config.ts");
      expect([...first.copiedFiles, ...first.skippedFiles]).toContain("scripts/db-migrate.ts");
      expect([...first.copiedFiles, ...first.skippedFiles]).toContain("scripts/db-push.ts");
      expect([...first.copiedFiles, ...first.skippedFiles]).toContain("src/env/database.ts");
      expect([...first.copiedFiles, ...first.skippedFiles]).toContain("src/server/db/bootstrap.ts");
    }
    expect(second.packageChanged).toBe(false);
    expect(packageJson.dependencies["drizzle-orm"]).toBe("^0.45.2");
    expect(packageJson.dependencies.postgres).toBe("^3.4.7");
    expect(packageJson.devDependencies["drizzle-kit"]).toBe("^0.31.4");
    expect(packageJson.scripts["db:migrate"]).toBe("bun run ./scripts/db-migrate.ts");
    expect(packageJson.scripts["db:push"]).toBe("bun run ./scripts/db-push.ts");
    expect(packageJson.scripts["_db:push:app"]).toBe("drizzle-kit push");
    expect(packageJson.waferAddons).toContain("db");
    expect(await readFile(path.join(rootDir, "package.json"), "utf8")).toMatch(
      /"waferAddons": \[[^\n]+\]/
    );
  });

  test("refuses package.json conflicts before copying add-on files", async () => {
    const rootDir = await copyTemplate();
    const packagePath = path.join(rootDir, "package.json");
    const drizzlePath = path.join(rootDir, "drizzle.config.ts");
    const originalDrizzle = await readOptionalFile(drizzlePath);
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

    packageJson.dependencies = {
      ...packageJson.dependencies,
      "drizzle-orm": "^0.1.0",
    };
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

    await expect(installAddon({ rootDir, addonName: "db" })).rejects.toThrow(
      'Add-on "db" wants package.json dependencies.drizzle-orm="^0.45.2"'
    );
    expect(await readOptionalFile(drizzlePath)).toBe(originalDrizzle);
  });

  test("requires db before installing the example feature", async () => {
    const rootDir = await copyTemplate();
    const hadExampleFeature = await hasAddon(rootDir, "example-feature");
    await removeDbMetadata(rootDir);

    await expect(installAddon({ rootDir, addonName: "example-feature" })).rejects.toThrow(
      'Add-on "example-feature" requires "db". Run bun run add db first.'
    );

    await installAddon({ rootDir, addonName: "db", force: hadExampleFeature });
    const result = await installAddon({
      rootDir,
      addonName: "example-feature",
      force: hadExampleFeature,
    });
    const server = await readFile(path.join(rootDir, "src/server/app.ts"), "utf8");
    const home = await readFile(path.join(rootDir, "src/client/routes/index.tsx"), "utf8");

    if (!hadExampleFeature) {
      expect(result.copiedFiles).toContain("src/server/routes/todos.ts");
      expect(result.patchedFiles).toContain("src/server/app.ts");
    }
    expect(server).toContain('app.route("/api/todos", todosRoute);');
    expect(home).toContain('href: "/todos"');
  });

  test("can force repair files for an already installed add-on", async () => {
    const rootDir = await copyTemplate();

    await installAddon({ rootDir, addonName: "db" });
    const schemaPath = path.join(rootDir, "src/server/db/schema.ts");
    await writeFile(schemaPath, "export const custom = true;\n");

    const unchanged = await installAddon({ rootDir, addonName: "db" });
    expect(unchanged.copiedFiles).not.toContain("src/server/db/schema.ts");
    expect(await readFile(schemaPath, "utf8")).toBe("export const custom = true;\n");

    const result = await installAddon({ rootDir, addonName: "db", force: true });
    const schema = await readFile(schemaPath, "utf8");
    const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));

    expect(result.copiedFiles).toContain("src/server/db/schema.ts");
    expect(schema).toContain("export {};");
    expect(packageJson.waferAddons.filter((name: string) => name === "db")).toHaveLength(1);
  });

  test("does not mark an add-on installed when file copying fails", async () => {
    const rootDir = await copyTemplate();
    const packagePath = path.join(rootDir, "package.json");
    await removeDbMetadata(rootDir);
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

    await mkdir(path.join(rootDir, "src/server/db"), { recursive: true });
    await writeFile(path.join(rootDir, "src/server/db/schema.ts"), "export const custom = true;\n");

    await expect(installAddon({ rootDir, addonName: "db" })).rejects.toThrow(
      "Refusing to overwrite src/server/db/schema.ts"
    );

    const after = JSON.parse(await readFile(packagePath, "utf8"));
    expect(after.waferAddons ?? []).not.toContain("db");
    expect(after.dependencies["drizzle-orm"]).toBeUndefined();
  });

  test("installs Clerk auth without database dependencies", async () => {
    const rootDir = await copyTemplate();
    await removeDbMetadata(rootDir);

    await installAddon({ rootDir, addonName: "auth-clerk" });
    const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
    const main = await readFile(path.join(rootDir, "src/client/main.tsx"), "utf8");
    const signInRoute = await readFile(path.join(rootDir, "src/client/routes/sign-in.tsx"), "utf8");
    const home = await readFile(path.join(rootDir, "src/client/routes/index.tsx"), "utf8");
    const app = await readFile(path.join(rootDir, "src/server/app.ts"), "utf8");

    expect(packageJson.dependencies["@clerk/backend"]).toBe("^3.4.1");
    expect(packageJson.dependencies["@clerk/react"]).toBe("^6.4.5");
    expect(packageJson.dependencies["drizzle-orm"]).toBeUndefined();
    expect(main).toContain("ClerkAuthProvider");
    expect(main).toContain("signInRoute");
    expect(main).not.toContain("signUpRoute");
    expect(signInRoute).toContain("<SignIn");
    expect(signInRoute).toContain("withSignUp");
    expect(signInRoute).not.toContain("<ClerkAuthProvider>");
    expect(home).toContain('href: "/sign-in"');
    expect(app).toContain('app.route("/api/auth", authRoute);');
  });

  test("keeps committed env examples safe after copying", async () => {
    const startEnv = await readOptionalFile(path.join(templateRoot, "../wafer-start/.env.example"));
    const defaultEnv = await readFile(path.join(templateRoot, ".env.example"), "utf8");
    const dbEnv = await readFile(
      path.join(templateRoot, "addons/db/files/.env.db.example"),
      "utf8"
    );

    expect(defaultEnv).toContain("Run bun run add db or bun run setup:auth");
    if (startEnv) {
      expect(startEnv).toContain("# PG_BOOTSTRAP_URL=postgresql://postgres@localhost/postgres");
      expect(startEnv).toContain("# DATABASE_NAME=");
      expect(startEnv).not.toMatch(/^PG_BOOTSTRAP_URL=/m);
      expect(startEnv).not.toMatch(/^DATABASE_NAME=/m);
    }
    expect(dbEnv).toContain("# PG_BOOTSTRAP_URL=postgresql://postgres@localhost/postgres");
    expect(dbEnv).toContain("# DATABASE_NAME=");
    expect(dbEnv).not.toMatch(/^PG_BOOTSTRAP_URL=/m);
    expect(dbEnv).not.toMatch(/^DATABASE_NAME=/m);
  });

  test("resolves direct and bootstrap database env for the db add-on", () => {
    expect(resolveDatabaseMode({})).toBe("unconfigured");
    expect(resolveConfiguredDatabaseUrl({})).toBeUndefined();
    expect(
      resolveConfiguredDatabaseUrl({
        DATABASE_URL: "postgresql://postgres@localhost/direct",
        DATABASE_NAME: "ignored",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/postgres",
      })
    ).toBe("postgresql://postgres@localhost/direct");
    expect(
      resolveConfiguredDatabaseUrl({
        DATABASE_NAME: "app_db",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/postgres",
      })
    ).toBe("postgresql://postgres@localhost/app_db");
    expect(buildDatabaseUrl("postgresql://postgres@localhost/postgres", "project_db")).toBe(
      "postgresql://postgres@localhost/project_db"
    );
    expect(() =>
      readDatabaseEnv({ PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/postgres" })
    ).toThrow("DATABASE_NAME is required");
    expect(() => readDatabaseEnv({ DATABASE_NAME: "app_db" })).toThrow(
      "PG_BOOTSTRAP_URL is required"
    );
  });

  test("copies a clean template without local install or build artifacts", () => {
    expect(shouldCopyTemplatePath(path.join(templateRoot, "src/server/app.ts"), templateRoot)).toBe(
      true
    );
    expect(shouldCopyTemplatePath(path.join(templateRoot, "bunfig.toml"), templateRoot)).toBe(true);
    expect(
      shouldCopyTemplatePath(path.join(templateRoot, "node_modules/react/index.js"), templateRoot)
    ).toBe(false);
    expect(
      shouldCopyTemplatePath(path.join(templateRoot, "dist/client/index.html"), templateRoot)
    ).toBe(false);
    expect(shouldCopyTemplatePath(path.join(templateRoot, ".env.local"), templateRoot)).toBe(false);
    expect(
      shouldCopyTemplatePath(path.join(templateRoot, ".clerk/config.json"), templateRoot)
    ).toBe(false);
  });
});

async function copyTemplate() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "wafer-default-addon-"));
  await copyTemplateSource(templateRoot, rootDir);
  return rootDir;
}

async function readOptionalFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function hasAddon(rootDir: string, addonName: string) {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
  return packageJson.waferAddons?.includes(addonName) ?? false;
}

async function removeDbMetadata(rootDir: string) {
  const packagePath = path.join(rootDir, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  packageJson.waferAddons = (packageJson.waferAddons ?? []).filter((name: string) => name !== "db");
  packageJson.dependencies = omitKeys(packageJson.dependencies, ["drizzle-orm", "postgres"]);
  packageJson.devDependencies = omitKeys(packageJson.devDependencies, ["drizzle-kit"]);
  packageJson.scripts = omitKeys(packageJson.scripts, [
    "db:generate",
    "db:migrate",
    "db:push",
    "_db:push:app",
  ]);

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function omitKeys(values: Record<string, string> | undefined, keys: string[]) {
  return Object.fromEntries(Object.entries(values ?? {}).filter(([key]) => !keys.includes(key)));
}
