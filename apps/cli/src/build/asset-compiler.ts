import {
  DESTARIA_ASSET_CLASS_MARKER,
  type Asset,
  type AssetClassMarker,
} from "@destaria/authoring";
import { type CompiledAsset, validateMeshDescriptor } from "@destaria/package-format";
import { z } from "zod";

import { BuildError } from "./errors";
import { formatProjectPath } from "./paths";

type AssetClass = typeof Asset & {
  readonly name: string;
  readonly mesh?: unknown;
  readonly [DESTARIA_ASSET_CLASS_MARKER]?: AssetClassMarker;
};

type LoadedAssetModule = {
  assetFile: string;
  moduleExports: Record<string, unknown>;
};

type AssetDeclaration = {
  assetClass: AssetClass;
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
      if (!isAssetClass(exportedValue)) {
        continue;
      }

      if (exportName === "default") {
        throw new BuildError(
          `Asset from ${formatProjectPath(projectRoot, assetFile)} must use a named export.`,
        );
      }

      if (exportedValue.name.length === 0) {
        throw new BuildError(
          `Asset export "${exportName}" from ${formatProjectPath(projectRoot, assetFile)} must be a named class.`,
        );
      }

      const id = createAssetId(projectRoot, assetFile, exportedValue);
      declarations.push({
        assetClass: exportedValue,
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
  const { assetClass, assetFile, id } = declaration;

  if (assetClass.mesh === undefined) {
    throw new BuildError(
      `Asset "${id}" from ${formatProjectPath(projectRoot, assetFile)} must define a static mesh.`,
    );
  }

  try {
    return {
      id,
      mesh: validateMeshDescriptor(assetClass.mesh),
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

function isAssetClass(value: unknown): value is AssetClass {
  return (
    typeof value === "function" &&
    (value as Partial<AssetClass>)[DESTARIA_ASSET_CLASS_MARKER] === true
  );
}

function createAssetId(projectRoot: string, assetFile: string, assetClass: AssetClass): string {
  return `${formatProjectPath(projectRoot, assetFile)}:${assetClass.name}`;
}
