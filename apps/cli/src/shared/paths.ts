import path from "node:path";

import { BuildError } from "./errors";

const DEFAULT_ASSET_REGISTRY_OUTPUT = path.join("dist", "asset-registry.json");

export function resolveProjectRoot(projectRoot?: string): string {
  return path.resolve(projectRoot ?? process.cwd());
}

export function resolveOutputFile(projectRoot: string, outputFile?: string): string {
  const requestedOutput = outputFile ?? DEFAULT_ASSET_REGISTRY_OUTPUT;

  return resolveProjectRelativePath(projectRoot, requestedOutput, "Build output");
}

export function resolveProjectRelativePath(
  projectRoot: string,
  value: string,
  label: string,
  boundary = "project root",
  options: { allowRoot?: boolean } = {},
): string {
  if (path.isAbsolute(value)) {
    throw new BuildError(`${label} must be relative to the ${boundary}.`);
  }

  const resolvedPath = path.resolve(projectRoot, value);
  const relativePath = path.relative(projectRoot, resolvedPath);

  if (
    (relativePath === "" && options.allowRoot !== true) ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new BuildError(`${label} must stay inside the ${boundary}.`);
  }

  return resolvedPath;
}

export function formatProjectPath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join(path.posix.sep);
}
