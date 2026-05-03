import path from "node:path";

import { BuildError } from "./errors";

const DEFAULT_ASSET_REGISTRY_OUTPUT = path.join("dist", "asset-registry.json");

export function resolveProjectRoot(projectRoot?: string): string {
  return path.resolve(projectRoot ?? process.cwd());
}

export function resolveOutputFile(projectRoot: string, outputFile?: string): string {
  const requestedOutput = outputFile ?? DEFAULT_ASSET_REGISTRY_OUTPUT;

  if (path.isAbsolute(requestedOutput)) {
    throw new BuildError("Build output must be relative to the project root.");
  }

  const resolvedOutput = path.resolve(projectRoot, requestedOutput);
  const relativeOutput = path.relative(projectRoot, resolvedOutput);

  if (relativeOutput === "" || relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
    throw new BuildError("Build output must stay inside the project root.");
  }

  return resolvedOutput;
}

export function formatProjectPath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join(path.posix.sep);
}
