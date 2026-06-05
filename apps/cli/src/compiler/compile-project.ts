import { loadAssetModules } from "./asset-loader";
import { compileProjectModules, type CompiledProject } from "./project-compiler";
import { loadSceneModule } from "./scene-loader";
import type { ProjectContext } from "../project/context";
import type { SourceRegistry } from "../project/source-registry";

export async function compileProject(
  projectContext: ProjectContext,
  sourceRegistry: SourceRegistry,
): Promise<CompiledProject> {
  const assetModules = await loadAssetModules(
    projectContext.projectRoot,
    sourceRegistry.assetFiles,
  );
  const entrySceneModule = await loadSceneModule(
    projectContext.projectRoot,
    sourceRegistry.entrySceneFile,
  );

  return compileProjectModules(projectContext.projectRoot, assetModules, entrySceneModule);
}
