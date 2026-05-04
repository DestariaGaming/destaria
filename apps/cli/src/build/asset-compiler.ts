import type { AssetDefinition } from "@destaria/authoring";
import { isAssetDefinition } from "@destaria/authoring/compiler";
import type { JsonObject } from "@destaria/package-format";
import {
  type CompiledAsset,
  validateJsonValue,
  validateMeshDescriptor,
} from "@destaria/package-format";
import { z } from "zod";

import { BuildError } from "./errors";
import { formatProjectPath } from "./paths";

type LoadedAssetModule = {
  assetFile: string;
  moduleExports: Record<string, unknown>;
};

type AssetDeclaration = {
  assetDefinition: AssetDefinition<JsonObject>;
  assetFile: string;
  exportName: string;
  id: string;
  location: string;
};

export function compileAssetModules(
  projectRoot: string,
  assetModules: LoadedAssetModule[],
): CompiledAsset[] {
  const declarations = collectAssetDeclarations(projectRoot, assetModules);
  const declarationsById = new Map<string, AssetDeclaration>();
  const assets: CompiledAsset[] = [];

  for (const declaration of declarations) {
    const previousDeclaration = declarationsById.get(declaration.id);
    if (previousDeclaration !== undefined) {
      throw new BuildError(
        `Duplicate asset id "${declaration.id}" generated from ${previousDeclaration.location} and ${declaration.location}.`,
      );
    }

    declarationsById.set(declaration.id, declaration);
    assets.push(compileAsset(projectRoot, declaration));
  }

  return assets.toSorted((left, right) => left.id.localeCompare(right.id));
}

function collectAssetDeclarations(
  projectRoot: string,
  assetModules: LoadedAssetModule[],
): AssetDeclaration[] {
  const declarations: AssetDeclaration[] = [];

  for (const { assetFile, moduleExports } of assetModules) {
    for (const [exportName, exportedValue] of Object.entries(moduleExports)) {
      if (!isAssetDefinition(exportedValue)) {
        continue;
      }

      if (exportName === "default") {
        throw new BuildError(
          `Asset definition from ${formatProjectPath(projectRoot, assetFile)} must use a named export.`,
        );
      }

      const id = createAssetId(projectRoot, assetFile, exportName);
      declarations.push({
        assetDefinition: exportedValue,
        assetFile,
        exportName,
        id,
        location: `${formatProjectPath(projectRoot, assetFile)}:${exportName}`,
      });
    }
  }

  return declarations;
}

function compileAsset(projectRoot: string, declaration: AssetDeclaration): CompiledAsset {
  const { assetDefinition, assetFile, id } = declaration;

  try {
    validateJsonValue(assetDefinition.defaultProps, "defaultProps");
  } catch (error) {
    if (error instanceof TypeError) {
      const invalidPath = error.message.replace(/ must be JSON-safe\.$/, "");
      throw new BuildError(
        `Asset "${id}" from ${formatProjectPath(projectRoot, assetFile)} has non-JSON default props at ${invalidPath}.`,
      );
    }

    throw error;
  }

  let meshDescriptor: unknown;
  try {
    meshDescriptor = assetDefinition.mesh(assetDefinition.defaultProps);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BuildError(
      `Asset "${id}" from ${formatProjectPath(projectRoot, assetFile)} failed to produce mesh metadata: ${detail}`,
    );
  }

  try {
    return {
      id,
      mesh: validateMeshDescriptor(meshDescriptor),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BuildError(
        `Asset "${id}" from ${formatProjectPath(projectRoot, assetFile)} has an invalid mesh descriptor: ${z.prettifyError(error)}`,
      );
    }

    throw error;
  }
}

function createAssetId(projectRoot: string, assetFile: string, exportName: string): string {
  return `${formatProjectPath(projectRoot, assetFile)}:${exportName}`;
}
