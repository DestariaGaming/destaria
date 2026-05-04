import { mkdir } from "node:fs/promises";
import path from "node:path";

import { type AssetRegistry, validateAssetRegistry } from "@destaria/package-format";

import { compileAssetModules } from "./asset-compiler";
import { discoverAssetFiles } from "./asset-discovery";
import { loadAssetModules } from "./asset-loader";
export { BuildError } from "./errors";
import { getProjectContext, loadProjectContext, type ProjectContext } from "../project-context";

export type BuildProjectOptions = {
  projectRoot?: string;
  outputFile?: string;
};

export type BuildProjectResult = {
  projectRoot: string;
  outputFile: string;
  registry: AssetRegistry;
};

export async function buildProject(options: BuildProjectOptions = {}): Promise<BuildProjectResult> {
  const projectContext = await resolveBuildProjectContext(options);
  const projectRoot = projectContext.projectRoot;
  const outputFile = projectContext.assetRegistryOutputFile;
  const assetFiles = await discoverAssetFiles(projectRoot);
  const assetModules = await loadAssetModules(projectRoot, assetFiles);
  const assets = compileAssetModules(projectRoot, assetModules);
  const registry = validateAssetRegistry({ version: 1, assets });

  await mkdir(path.dirname(outputFile), { recursive: true });
  await Bun.write(outputFile, `${JSON.stringify(registry, null, 2)}\n`);

  return {
    projectRoot,
    outputFile,
    registry,
  };
}

export { discoverAssetFiles };

async function resolveBuildProjectContext(options: BuildProjectOptions): Promise<ProjectContext> {
  if (options.projectRoot !== undefined || options.outputFile !== undefined) {
    return await loadProjectContext({
      projectRoot: options.projectRoot,
      outputFile: options.outputFile,
    });
  }

  return await getProjectContext();
}
