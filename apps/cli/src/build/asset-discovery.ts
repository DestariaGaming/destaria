import { readdir } from "node:fs/promises";
import path from "node:path";

import { formatProjectPath } from "./paths";

export async function discoverAssetFiles(projectRoot: string): Promise<string[]> {
  const assetsRoot = path.join(projectRoot, "src", "assets");
  const files = await collectAssetFiles(assetsRoot);

  return files.toSorted((left, right) =>
    formatProjectPath(projectRoot, left).localeCompare(formatProjectPath(projectRoot, right)),
  );
}

async function collectAssetFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }

  const nestedFiles = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => collectAssetFiles(path.join(directory, entry.name))),
  );

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".asset.ts"))
    .map((entry) => path.join(directory, entry.name));

  return [...files, ...nestedFiles.flat()];
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
