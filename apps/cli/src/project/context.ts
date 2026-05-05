import path from "node:path";
import { pathToFileURL } from "node:url";

import { getCommandContext } from "cli-forge/context";

import { type DestariaConfigDefinition, isDestariaConfigDefinition } from "../config";
import { BuildError } from "../shared/errors";
import { isFile } from "../shared/fs";
import { formatProjectPath, resolveProjectRelativePath, resolveProjectRoot } from "../shared/paths";

export const DESTARIA_CONFIG_FILE_NAME = "destaria.config.ts";
const DEFAULT_SOURCE_ROOT = "src";

export type ProjectContextOptions = {
  projectRoot?: string;
  outputFile?: string;
};

export type ProjectContext = {
  projectRoot: string;
  configFile: string;
  config: DestariaConfigDefinition;
  sourceRoot: string;
  entryScene: string;
  outputDir: string;
  assetRegistryOutputFile: string;
};

type ProjectContextProvider = {
  inject(key: "projectContext"): Promise<ProjectContext>;
};

export async function getProjectContext(): Promise<ProjectContext> {
  return await (getCommandContext() as ProjectContextProvider).inject("projectContext");
}

export async function loadProjectContext(
  options: ProjectContextOptions = {},
): Promise<ProjectContext> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const configFile = path.join(projectRoot, DESTARIA_CONFIG_FILE_NAME);

  if (!(await isFile(configFile))) {
    throw new BuildError(`Missing Destaria config file: ${DESTARIA_CONFIG_FILE_NAME}`);
  }

  const config = await importConfigModule(projectRoot, configFile);
  validateConfigShape(config);

  const sourceRoot = resolveProjectRelativePath(
    projectRoot,
    config.source?.root ?? DEFAULT_SOURCE_ROOT,
    "Config source.root",
    "project root",
    { allowRoot: true },
  );
  const entryScene = resolveProjectRelativePath(
    sourceRoot,
    config.entry,
    "Config entry",
    "source root",
  );
  const outputDir = resolveProjectRelativePath(projectRoot, config.output.dir, "Config output.dir");
  const assetRegistryOutputFile =
    options.outputFile === undefined
      ? path.join(outputDir, "asset-registry.json")
      : resolveProjectRelativePath(projectRoot, options.outputFile, "Build output");

  return {
    projectRoot,
    configFile,
    config,
    sourceRoot,
    entryScene,
    outputDir,
    assetRegistryOutputFile,
  };
}

async function importConfigModule(
  projectRoot: string,
  configFile: string,
): Promise<DestariaConfigDefinition> {
  try {
    const moduleExports = await import(pathToFileURL(configFile).href);
    const config = (moduleExports as { default?: unknown }).default;

    if (!isDestariaConfigDefinition(config)) {
      throw new BuildError(`${DESTARIA_CONFIG_FILE_NAME} must default export defineConfig(...).`);
    }

    return config;
  } catch (error) {
    if (error instanceof BuildError) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new BuildError(`Failed to load ${formatProjectPath(projectRoot, configFile)}: ${detail}`);
  }
}

function validateConfigShape(config: DestariaConfigDefinition): void {
  if (typeof config.entry !== "string") {
    throw new BuildError("Config entry must be a string.");
  }

  if (!config.entry.endsWith(".scene.ts")) {
    throw new BuildError("Config entry must reference a .scene.ts file.");
  }

  if (config.source !== undefined) {
    if (config.source === null || typeof config.source !== "object") {
      throw new BuildError("Config source must be an object.");
    }

    if (config.source.root !== undefined && typeof config.source.root !== "string") {
      throw new BuildError("Config source.root must be a string.");
    }
  }

  if (config.output === null || typeof config.output !== "object") {
    throw new BuildError("Config output must be an object.");
  }

  if (typeof config.output.dir !== "string") {
    throw new BuildError("Config output.dir must be a string.");
  }
}
