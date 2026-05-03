import { mkdir } from "node:fs/promises";
import path from "node:path";

import { type AssetRegistry, validateAssetRegistry } from "@destaria/package-format";

import { compileAssetModules } from "./asset-compiler";
import { discoverAssetFiles } from "./asset-discovery";
import { loadAssetModules } from "./asset-loader";
export { BuildError } from "./errors";
import { resolveOutputFile, resolveProjectRoot } from "./paths";

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
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const outputFile = resolveOutputFile(projectRoot, options.outputFile);
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
