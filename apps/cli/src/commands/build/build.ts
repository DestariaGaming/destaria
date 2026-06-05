import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { AssetRegistry, CompiledSceneGraph, ManifestInput } from "@destaria/package-format";

import { compileProject } from "../../compiler/compile-project";
import { getProjectContext, loadProjectContext, type ProjectContext } from "../../project/context";
import {
  discoverSourceRegistry,
  getSourceRegistry,
  type SourceRegistry,
} from "../../project/source-registry";

export type BuildProjectOptions = {
  projectRoot?: string;
  outputFile?: string;
};

export type BuildProjectResult = {
  projectRoot: string;
  outputFile: string;
  assetRegistry: AssetRegistry;
  sceneGraph: CompiledSceneGraph;
  manifestInput: ManifestInput;
};

export async function buildProject(options: BuildProjectOptions = {}): Promise<BuildProjectResult> {
  const projectContext = await resolveBuildProjectContext(options);
  const projectRoot = projectContext.projectRoot;
  const outputFile = projectContext.assetRegistryOutputFile;
  const sourceRegistry = await resolveSourceRegistry(projectContext, options);
  const compiledProject = await compileProject(projectContext, sourceRegistry);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await Bun.write(outputFile, `${JSON.stringify(compiledProject.assetRegistry, null, 2)}\n`);

  return {
    projectRoot,
    outputFile,
    ...compiledProject,
  };
}

async function resolveBuildProjectContext(options: BuildProjectOptions): Promise<ProjectContext> {
  if (options.projectRoot !== undefined || options.outputFile !== undefined) {
    return await loadProjectContext({
      projectRoot: options.projectRoot,
      outputFile: options.outputFile,
    });
  }

  return await getProjectContext();
}

async function resolveSourceRegistry(
  projectContext: ProjectContext,
  options: BuildProjectOptions,
): Promise<SourceRegistry> {
  if (options.projectRoot !== undefined || options.outputFile !== undefined) {
    return await discoverSourceRegistry(projectContext);
  }

  return await getSourceRegistry();
}
