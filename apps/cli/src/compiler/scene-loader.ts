import { pathToFileURL } from "node:url";

import { BuildError } from "../shared/errors";
import { formatProjectPath } from "../shared/paths";

export type LoadedSceneModule = {
  sceneFile: string;
  moduleExports: Record<string, unknown>;
};

export async function loadSceneModule(
  projectRoot: string,
  sceneFile: string,
): Promise<LoadedSceneModule> {
  return {
    sceneFile,
    moduleExports: await importSceneModule(projectRoot, sceneFile),
  };
}

async function importSceneModule(
  projectRoot: string,
  sceneFile: string,
): Promise<Record<string, unknown>> {
  try {
    return await import(pathToFileURL(sceneFile).href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BuildError(
      `Failed to load scene module ${formatProjectPath(projectRoot, sceneFile)}: ${detail}`,
    );
  }
}
