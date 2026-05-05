import { readdir } from "node:fs/promises";
import path from "node:path";

import { getCommandContext } from "cli-forge/context";
import ignore, { type Ignore } from "ignore";

import { getProjectContext, type ProjectContext } from "./context";
import { BuildError } from "../shared/errors";
import { isDirectory, isFile } from "../shared/fs";
import { formatProjectPath } from "../shared/paths";

export type SourceRegistry = {
  entrySceneFile: string;
  assetFiles: string[];
  sceneFiles: string[];
};

type SourceRegistryProvider = {
  inject(key: "sourceRegistry"): Promise<SourceRegistry>;
};

export async function getSourceRegistry(): Promise<SourceRegistry> {
  return await (getCommandContext() as SourceRegistryProvider).inject("sourceRegistry");
}

export async function discoverSourceRegistry(
  projectContext: ProjectContext,
): Promise<SourceRegistry> {
  if (!(await isDirectory(projectContext.sourceRoot))) {
    throw new BuildError(
      `Missing source root: ${formatProjectPath(projectContext.projectRoot, projectContext.sourceRoot)}`,
    );
  }

  if (!(await isFile(projectContext.entryScene))) {
    throw new BuildError(
      `Missing entry scene: ${formatProjectPath(projectContext.projectRoot, projectContext.entryScene)}`,
    );
  }

  const ignoreMatcher = await loadProjectIgnoreMatcher(projectContext.projectRoot);
  const files = await collectSourceFiles(projectContext.sourceRoot, projectContext, ignoreMatcher);

  return {
    entrySceneFile: projectContext.entryScene,
    assetFiles: sortProjectFiles(
      projectContext.projectRoot,
      files.filter((file) => file.endsWith(".asset.ts")),
    ),
    sceneFiles: sortProjectFiles(
      projectContext.projectRoot,
      files.filter((file) => file.endsWith(".scene.ts")),
    ),
  };
}

export async function loadSourceRegistry(): Promise<SourceRegistry> {
  return await discoverSourceRegistry(await getProjectContext());
}

async function collectSourceFiles(
  directory: string,
  projectContext: ProjectContext,
  ignoreMatcher: Ignore,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  const nestedDirectories: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (shouldSkipPath(projectContext, ignoreMatcher, entryPath, entry.isDirectory())) {
      continue;
    }

    if (entry.isDirectory()) {
      nestedDirectories.push(entryPath);
      continue;
    }

    if (entry.isFile() && isDiscoverableSourceFile(entry.name)) {
      files.push(entryPath);
    }
  }

  const nestedFiles = await Promise.all(
    nestedDirectories.map((entryPath) =>
      collectSourceFiles(entryPath, projectContext, ignoreMatcher),
    ),
  );

  return [...files, ...nestedFiles.flat()];
}

function isDiscoverableSourceFile(fileName: string): boolean {
  return fileName.endsWith(".asset.ts") || fileName.endsWith(".scene.ts");
}

function sortProjectFiles(projectRoot: string, files: string[]): string[] {
  return files.toSorted((left, right) =>
    formatProjectPath(projectRoot, left).localeCompare(formatProjectPath(projectRoot, right)),
  );
}

async function loadProjectIgnoreMatcher(projectRoot: string): Promise<Ignore> {
  const matcher = ignore();
  const gitignoreFile = path.join(projectRoot, ".gitignore");

  if (await isFile(gitignoreFile)) {
    matcher.add(await Bun.file(gitignoreFile).text());
  }

  return matcher;
}

function shouldSkipPath(
  projectContext: ProjectContext,
  ignoreMatcher: Ignore,
  filePath: string,
  directory: boolean,
): boolean {
  if (isOutputPath(projectContext, filePath)) {
    return true;
  }

  if (isAlwaysSkippedPath(projectContext, filePath)) {
    return true;
  }

  return ignoreMatcher.ignores(formatIgnorePath(projectContext.projectRoot, filePath, directory));
}

function isAlwaysSkippedPath(projectContext: ProjectContext, filePath: string): boolean {
  if (isOutputPath(projectContext, filePath)) {
    return true;
  }

  return path
    .relative(projectContext.projectRoot, filePath)
    .split(path.sep)
    .some((segment) => [".git", ".repos", "node_modules"].includes(segment));
}

function isOutputPath(projectContext: ProjectContext, filePath: string): boolean {
  const relativePath = path.relative(projectContext.outputDir, filePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function formatIgnorePath(projectRoot: string, filePath: string, directory: boolean): string {
  const relativePath = formatProjectPath(projectRoot, filePath);

  return directory ? `${relativePath}/` : relativePath;
}
