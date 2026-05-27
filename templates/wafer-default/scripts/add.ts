import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AddonManifest {
  name: string;
  description: string;
  requires?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  files?: string;
  patches?: AddonPatch[];
  nextSteps?: string[];
}

export type AddonPatch =
  | { type: "insertAfterMarker"; file: string; marker: string; snippet: string }
  | { type: "insertAfterMarkerSorted"; file: string; marker: string; snippet: string }
  | { type: "wrapMarker"; file: string; marker: string; before: string; after: string };

export interface AddonInstallOptions {
  rootDir: string;
  addonName: string;
  force?: boolean;
}

export interface AddonInstallResult {
  addonName: string;
  copiedFiles: string[];
  skippedFiles: string[];
  patchedFiles: string[];
  packageChanged: boolean;
  nextSteps: string[];
}

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  waferAddons?: string[];
}

export async function installAddon(options: AddonInstallOptions): Promise<AddonInstallResult> {
  const manifest = await readManifest(options.rootDir, options.addonName);
  const packagePath = path.join(options.rootDir, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as PackageJson;
  const installedAddons = new Set(packageJson.waferAddons ?? []);
  const missing = (manifest.requires ?? []).filter((name) => !installedAddons.has(name));

  if (missing.length > 0) {
    const requiredAddons = missing.map((name) => `"${name}"`).join(", ");
    const installCommands = missing.map((name) => `bun run add ${name}`).join(" and ");

    throw new Error(
      `Add-on "${manifest.name}" requires ${requiredAddons}. Run ${installCommands} first.`
    );
  }

  const result: AddonInstallResult = {
    addonName: manifest.name,
    copiedFiles: [],
    skippedFiles: [],
    patchedFiles: [],
    packageChanged: false,
    nextSteps: manifest.nextSteps ?? [],
  };

  assertPackageJsonCanMerge(packageJson, manifest);
  for (const patch of manifest.patches ?? []) {
    await assertCanApplyPatch(options.rootDir, patch);
  }

  if (manifest.files && (!installedAddons.has(manifest.name) || options.force)) {
    const sourceRoot = path.join(options.rootDir, "addons", manifest.name, manifest.files);
    await assertCanCopyAddonFiles(sourceRoot, options.rootDir, Boolean(options.force));
    await copyAddonFiles(sourceRoot, options.rootDir, {
      force: Boolean(options.force),
      result,
      rootDir: options.rootDir,
    });
  }

  for (const patch of manifest.patches ?? []) {
    const changed = await applyPatch(options.rootDir, patch);
    if (changed) {
      result.patchedFiles.push(patch.file);
    }
  }

  result.packageChanged = mergePackageJson(packageJson, manifest);
  if (!installedAddons.has(manifest.name)) {
    packageJson.waferAddons = [...installedAddons, manifest.name].sort();
    result.packageChanged = true;
  }
  if (result.packageChanged) {
    await writeJson(packagePath, packageJson);
  }

  return result;
}

async function readManifest(rootDir: string, addonName: string) {
  const addonRoot = path.join(rootDir, "addons", addonName);
  const manifestPath = path.join(addonRoot, "addon.json");

  if (!existsSync(manifestPath)) {
    const available = await listAvailableAddons(rootDir);
    throw new Error(`Unknown add-on "${addonName}". Available add-ons: ${available.join(", ")}`);
  }

  return JSON.parse(await readFile(manifestPath, "utf8")) as AddonManifest;
}

async function listAvailableAddons(rootDir: string) {
  const addonsRoot = path.join(rootDir, "addons");
  if (!existsSync(addonsRoot)) {
    return [];
  }

  return (await readdir(addonsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function mergePackageJson(packageJson: PackageJson, manifest: AddonManifest) {
  let changed = false;

  for (const [field, values] of [
    ["dependencies", manifest.dependencies],
    ["devDependencies", manifest.devDependencies],
    ["scripts", manifest.scripts],
  ] as const) {
    if (!values) {
      continue;
    }

    packageJson[field] ??= {};
    for (const [name, value] of Object.entries(values)) {
      if (packageJson[field][name]) {
        continue;
      }

      packageJson[field][name] = value;
      changed = true;
    }
  }

  return changed;
}

function assertPackageJsonCanMerge(packageJson: PackageJson, manifest: AddonManifest) {
  for (const [field, values] of [
    ["dependencies", manifest.dependencies],
    ["devDependencies", manifest.devDependencies],
    ["scripts", manifest.scripts],
  ] as const) {
    if (!values) {
      continue;
    }

    for (const [name, value] of Object.entries(values)) {
      const current = packageJson[field]?.[name];
      if (current && current !== value) {
        throw new Error(
          `Add-on "${manifest.name}" wants package.json ${field}.${name}="${value}", but it is already "${current}". Resolve the conflict, then rerun this command.`
        );
      }
    }
  }
}

interface CopyContext {
  rootDir: string;
  force: boolean;
  result: AddonInstallResult;
}

async function copyAddonFiles(sourceRoot: string, rootDir: string, context: CopyContext) {
  if (!existsSync(sourceRoot)) {
    return;
  }

  await copyDirectory(sourceRoot, rootDir, context);
}

async function assertCanCopyAddonFiles(sourceRoot: string, rootDir: string, force: boolean) {
  if (!existsSync(sourceRoot)) {
    return;
  }

  await assertCanCopyDirectory(sourceRoot, rootDir, rootDir, force);
}

async function assertCanCopyDirectory(
  sourceDir: string,
  destinationDir: string,
  rootDir: string,
  force: boolean
) {
  for (const entry of await readdir(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry);
    const destinationPath = path.join(destinationDir, entry);
    const sourceStat = await stat(sourcePath);

    if (sourceStat.isDirectory()) {
      await assertCanCopyDirectory(sourcePath, destinationPath, rootDir, force);
      continue;
    }

    await assertCanCopyFile(sourcePath, destinationPath.replace(/\.template$/, ""), rootDir, force);
  }
}

async function assertCanCopyFile(
  sourcePath: string,
  destinationPath: string,
  rootDir: string,
  force: boolean
) {
  if (!existsSync(destinationPath) || force) {
    return;
  }

  const [source, destination] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(destinationPath, "utf8"),
  ]);

  if (source === destination || isPlaceholderFile(destination)) {
    return;
  }

  const relativePath = path.relative(rootDir, destinationPath);
  throw new Error(`Refusing to overwrite ${relativePath}. Re-run with --force to replace it.`);
}

async function copyDirectory(sourceDir: string, destinationDir: string, context: CopyContext) {
  await mkdir(destinationDir, { recursive: true });

  for (const entry of await readdir(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry);
    const destinationPath = path.join(destinationDir, entry);
    const sourceStat = await stat(sourcePath);

    if (sourceStat.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath, context);
      continue;
    }

    await copyFile(sourcePath, destinationPath.replace(/\.template$/, ""), context);
  }
}

async function copyFile(sourcePath: string, destinationPath: string, context: CopyContext) {
  const relativePath = path.relative(context.rootDir, destinationPath);

  if (existsSync(destinationPath)) {
    const [source, destination] = await Promise.all([
      readFile(sourcePath, "utf8"),
      readFile(destinationPath, "utf8"),
    ]);

    if (source === destination) {
      context.result.skippedFiles.push(relativePath);
      return;
    }

    if (!context.force && !isPlaceholderFile(destination)) {
      throw new Error(`Refusing to overwrite ${relativePath}. Re-run with --force to replace it.`);
    }
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath);
  context.result.copiedFiles.push(relativePath);
}

function isPlaceholderFile(contents: string) {
  return contents.trim() === "export {};";
}

async function applyPatch(rootDir: string, patch: AddonPatch) {
  const filePath = path.join(rootDir, patch.file);
  const current = await readFile(filePath, "utf8");
  let next: string;

  switch (patch.type) {
    case "insertAfterMarker":
    case "insertAfterMarkerSorted":
      if (current.includes(patch.snippet)) {
        return false;
      }
      next = current.replace(patch.marker, `${patch.marker}\n${patch.snippet}`);
      if (patch.type === "insertAfterMarkerSorted") {
        next = sortImportsAfterMarker(next, patch.marker);
      }
      break;
    case "wrapMarker": {
      if (patchAlreadyApplied(current, patch)) {
        return false;
      }
      next = wrapMarkerLine(current, patch);
      break;
    }
    default: {
      const exhaustive: never = patch;
      throw new Error(`Unknown patch type: ${exhaustive}`);
    }
  }

  if (next === current) {
    throw new Error(`Could not find marker "${patch.marker}" in ${patch.file}.`);
  }

  await writeFile(filePath, next);
  return true;
}

function sortImportsAfterMarker(contents: string, marker: string) {
  const lines = contents.split("\n");
  const markerIndex = lines.findIndex((line) => line.includes(marker));
  if (markerIndex === -1) {
    return contents;
  }

  const start = markerIndex + 1;
  let end = start;
  while (end < lines.length && lines[end].startsWith("import ")) {
    end += 1;
  }

  const imports = lines.slice(start, end);
  const sorted = imports
    .map((line, index) => ({ index, key: importSortKey(line), line }))
    .sort((left, right) => left.key.localeCompare(right.key) || left.index - right.index)
    .map(({ line }) => line);

  lines.splice(start, imports.length, ...sorted);
  return lines.join("\n");
}

function importSortKey(line: string) {
  return line.match(/ from "([^"]+)"/)?.[1] ?? line;
}

function wrapMarkerLine(contents: string, patch: Extract<AddonPatch, { type: "wrapMarker" }>) {
  const lines = contents.split("\n");
  const index = lines.findIndex((line) => line.includes(patch.marker));
  if (index === -1) {
    return contents;
  }

  const indent = lines[index].match(/^\s*/)?.[0] ?? "";
  if (lines[index].trim() === patch.marker) {
    lines[index] = `${indent}${patch.before}\n${indent}  ${patch.marker}\n${indent}${patch.after}`;
    return lines.join("\n");
  }

  const markerIndex = lines[index].indexOf(patch.marker);
  const prefix = lines[index].slice(0, markerIndex);
  const suffix = lines[index].slice(markerIndex + patch.marker.length).trimStart();
  lines[index] = [
    `${prefix}`,
    `${indent}  ${patch.before}`,
    `${indent}    ${patch.marker}`,
    `${indent}  ${patch.after}`,
    `${indent}${suffix}`,
  ].join("\n");
  return lines.join("\n");
}

async function assertCanApplyPatch(rootDir: string, patch: AddonPatch) {
  const current = await readFile(path.join(rootDir, patch.file), "utf8");

  if (patchAlreadyApplied(current, patch) || current.includes(patch.marker)) {
    return;
  }

  throw new Error(`Could not find marker "${patch.marker}" in ${patch.file}.`);
}

function patchAlreadyApplied(current: string, patch: AddonPatch) {
  switch (patch.type) {
    case "insertAfterMarker":
    case "insertAfterMarkerSorted":
      return current.includes(patch.snippet);
    case "wrapMarker":
      return current.includes(patch.before) && current.includes(patch.after);
    default: {
      const exhaustive: never = patch;
      throw new Error(`Unknown patch type: ${exhaustive}`);
    }
  }
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${formatJson(value)}\n`);
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2).replace(
    /^( {2}"waferAddons": )\[\n((?: {4}"[^"]+",?\n)+) {2}\]/m,
    (_, prefix: string, body: string) => {
      const addons = body
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .join(" ");

      return `${prefix}[${addons}]`;
    }
  );
}

async function main() {
  const [, , addonName, ...flags] = process.argv;
  if (!addonName) {
    const available = await listAvailableAddons(process.cwd());
    throw new Error(`Usage: bun run add <addon>. Available add-ons: ${available.join(", ")}`);
  }

  const result = await installAddon({
    rootDir: process.cwd(),
    addonName,
    force: flags.includes("--force"),
  });

  console.log(`installed add-on: ${result.addonName}`);
  for (const file of result.copiedFiles) {
    console.log(`copied ${file}`);
  }
  for (const file of result.skippedFiles) {
    console.log(`skipped ${file}`);
  }
  for (const file of result.patchedFiles) {
    console.log(`patched ${file}`);
  }
  for (const step of result.nextSteps) {
    console.log(`next: ${step}`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
