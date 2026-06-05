import path from "node:path";

import type { PackageContents } from "@destaria/package-format";

import { compileProject } from "../../compiler/compile-project";
import { getProjectContext, loadProjectContext, type ProjectContext } from "../../project/context";
import {
  discoverSourceRegistry,
  getSourceRegistry,
  type SourceRegistry,
} from "../../project/source-registry";
import { PackageError } from "../../shared/errors";
import { writePackage } from "./package-writer";

export type PackageProjectOptions = {
  projectRoot?: string;
  outputFile?: string;
};

export type PackageProjectResult = {
  projectRoot: string;
  outputFile: string;
  contents: PackageContents;
};

export async function packageProject(
  options: PackageProjectOptions = {},
): Promise<PackageProjectResult> {
  const projectContext = await resolvePackageProjectContext(options);
  const outputFile = projectContext.packageOutputFile;
  validatePackageOutputFile(outputFile);
  const sourceRegistry = await resolveSourceRegistry(projectContext, options);
  const compiledProject = await compileProject(projectContext, sourceRegistry);
  const contents = {
    manifest: compiledProject.manifestInput,
    scene: compiledProject.sceneGraph,
    assetRegistry: compiledProject.assetRegistry,
  };

  await writePackage(outputFile, contents);

  return {
    projectRoot: projectContext.projectRoot,
    outputFile,
    contents,
  };
}

function validatePackageOutputFile(outputFile: string): void {
  if (path.extname(outputFile) !== ".destariapkg") {
    throw new PackageError("Package output must use the .destariapkg extension.");
  }
}

async function resolvePackageProjectContext(
  options: PackageProjectOptions,
): Promise<ProjectContext> {
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
  options: PackageProjectOptions,
): Promise<SourceRegistry> {
  if (options.projectRoot !== undefined || options.outputFile !== undefined) {
    return await discoverSourceRegistry(projectContext);
  }

  return await getSourceRegistry();
}
