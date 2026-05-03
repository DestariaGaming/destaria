import type { AssetDefinition, JsonObject, JsonValue } from "@destaria/authoring";
import { type CompiledAsset, validateMeshDescriptor } from "@destaria/package-format";
import { z } from "zod";

import { BuildError } from "./errors";
import { formatProjectPath } from "./paths";

const DESTARIA_ASSET_DEFINITION_MARKER = "__destariaAssetDefinition";

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

  validateJsonValue(assetDefinition.defaultProps, "defaultProps", projectRoot, assetFile, id);

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

function isAssetDefinition(value: unknown): value is AssetDefinition<JsonObject> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Partial<Record<typeof DESTARIA_ASSET_DEFINITION_MARKER, unknown>>)[
      DESTARIA_ASSET_DEFINITION_MARKER
    ] === true &&
    typeof (value as Partial<AssetDefinition<JsonObject>>).mesh === "function"
  );
}

function validateJsonValue(
  value: unknown,
  path: string,
  projectRoot: string,
  assetFile: string,
  id: string,
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateJsonValue(item, `${path}[${index}]`, projectRoot, assetFile, id),
    );
    return;
  }

  if (isPlainJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateJsonValue(item, `${path}.${key}`, projectRoot, assetFile, id);
    }
    return;
  }

  throw new BuildError(
    `Asset "${id}" from ${formatProjectPath(projectRoot, assetFile)} has non-JSON default props at ${path}.`,
  );
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function createAssetId(projectRoot: string, assetFile: string, exportName: string): string {
  return `${formatProjectPath(projectRoot, assetFile)}:${exportName}`;
}
