import { pathToFileURL } from "node:url";

import { BuildError } from "./errors";
import { formatProjectPath } from "./paths";

export type LoadedAssetModule = {
  assetFile: string;
  moduleExports: Record<string, unknown>;
};

export async function loadAssetModules(
  projectRoot: string,
  assetFiles: string[],
): Promise<LoadedAssetModule[]> {
  return Promise.all(
    assetFiles.map(async (assetFile) => ({
      assetFile,
      moduleExports: await importAssetModule(projectRoot, assetFile),
    })),
  );
}

async function importAssetModule(
  projectRoot: string,
  assetFile: string,
): Promise<Record<string, unknown>> {
  try {
    return await import(pathToFileURL(assetFile).href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BuildError(
      `Failed to load asset module ${formatProjectPath(projectRoot, assetFile)}: ${detail}`,
    );
  }
}
