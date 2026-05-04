import path from "node:path";
import { pathToFileURL } from "node:url";

import { getCommandContext } from "cli-forge/context";

import { type DestariaConfigDefinition, isDestariaConfigDefinition } from "./config";
import { BuildError } from "./build/errors";
import { resolveProjectRoot } from "./build/paths";

export const DESTARIA_CONFIG_FILE_NAME = "destaria.config.ts";

export type ProjectContextOptions = {
  projectRoot?: string;
  outputFile?: string;
};

export type ProjectContext = {
  projectRoot: string;
  configFile: string;
  config: DestariaConfigDefinition;
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

  if (!(await Bun.file(configFile).exists())) {
    throw new BuildError(`Missing Destaria config file: ${DESTARIA_CONFIG_FILE_NAME}`);
  }

  const config = await importConfigModule(projectRoot, configFile);
  validateConfigShape(config);

  const entryScene = resolveProjectRelativePath(projectRoot, config.entry, "Config entry");
  const outputDir = resolveProjectRelativePath(projectRoot, config.output.dir, "Config output.dir");
  const assetRegistryOutputFile =
    options.outputFile === undefined
      ? path.join(outputDir, "asset-registry.json")
      : resolveProjectRelativePath(projectRoot, options.outputFile, "Build output");

  return {
    projectRoot,
    configFile,
    config,
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

  if (config.output === null || typeof config.output !== "object") {
    throw new BuildError("Config output must be an object.");
  }

  if (typeof config.output.dir !== "string") {
    throw new BuildError("Config output.dir must be a string.");
  }
}

function resolveProjectRelativePath(projectRoot: string, value: string, label: string): string {
  if (path.isAbsolute(value)) {
    throw new BuildError(`${label} must be relative to the project root.`);
  }

  const resolvedPath = path.resolve(projectRoot, value);
  const relativePath = path.relative(projectRoot, resolvedPath);

  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new BuildError(`${label} must stay inside the project root.`);
  }

  return resolvedPath;
}

function formatProjectPath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join(path.posix.sep);
}
