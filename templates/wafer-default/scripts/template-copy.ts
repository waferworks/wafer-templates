import { cp } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([".clerk", ".git", "coverage", "dist", "node_modules"]);

export async function copyTemplateSource(sourceRoot: string, destinationRoot: string) {
  await cp(sourceRoot, destinationRoot, {
    recursive: true,
    filter: (sourcePath) => shouldCopyTemplatePath(sourcePath, sourceRoot),
  });
}

export function shouldCopyTemplatePath(sourcePath: string, sourceRoot: string) {
  const relativePath = path.relative(sourceRoot, sourcePath);
  if (!relativePath) {
    return true;
  }

  const parts = relativePath.split(path.sep);
  if (parts.some((part) => ignoredDirectories.has(part))) {
    return false;
  }

  const fileName = parts.at(-1) ?? "";
  return (
    fileName !== ".DS_Store" &&
    fileName !== ".env" &&
    fileName !== ".env.local" &&
    !(fileName.startsWith(".env.") && fileName.endsWith(".local"))
  );
}
