import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import type { PackageContents } from "@destaria/package-format";
import {
  PACKAGE_ASSET_REGISTRY_FILE,
  PACKAGE_MANIFEST_FILE,
  PACKAGE_SCENE_FILE,
  validatePackageContents,
} from "@destaria/package-format";

import { PackageError } from "../../shared/errors";

export async function writePackage(outputFile: string, value: PackageContents): Promise<void> {
  let contents: PackageContents;

  try {
    contents = validatePackageContents(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new PackageError(`Invalid package output: ${detail}`);
  }

  const temporaryFile = `${outputFile}.tmp-${crypto.randomUUID()}`;

  try {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await Bun.Archive.write(temporaryFile, {
      [PACKAGE_MANIFEST_FILE]: serializeJson(contents.manifest),
      [PACKAGE_SCENE_FILE]: serializeJson(contents.scene),
      [PACKAGE_ASSET_REGISTRY_FILE]: serializeJson(contents.assetRegistry),
    });
    await rename(temporaryFile, outputFile);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    const detail = error instanceof Error ? error.message : String(error);
    throw new PackageError(`Failed to write package ${outputFile}: ${detail}`);
  }
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
