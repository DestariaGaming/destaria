import type { AssetDefinition, EntityDescriptor, SceneDefinition } from "@destaria/authoring";
import { isSceneDefinition } from "@destaria/authoring/compiler";
import type {
  AssetRegistry,
  CompiledAsset,
  CompiledSceneGraph,
  JsonObject,
  JsonValue,
  ManifestInput,
} from "@destaria/package-format";
import {
  cloneJsonValue,
  isPlainJsonObject,
  validateAssetRegistry,
  validateCompiledSceneGraph,
  validateJsonValue,
  validateManifestInput,
} from "@destaria/package-format";

import {
  collectAssetDeclarations,
  compileAssetVariant,
  type AssetDeclaration,
} from "./asset-compiler";
import type { LoadedAssetModule } from "./asset-loader";
import type { LoadedSceneModule } from "./scene-loader";
import { BuildError } from "../shared/errors";
import { formatProjectPath } from "../shared/paths";

export type CompiledProject = {
  assetRegistry: AssetRegistry;
  sceneGraph: CompiledSceneGraph;
  manifestInput: ManifestInput;
};

type AssetResolution = {
  declaration: AssetDeclaration;
};

type AssetVariant = {
  asset: CompiledAsset;
  assetId: string;
};

export function compileProjectModules(
  projectRoot: string,
  assetModules: LoadedAssetModule[],
  entrySceneModule: LoadedSceneModule,
): CompiledProject {
  const assetDeclarations = collectAssetDeclarations(projectRoot, assetModules);
  const assetResolutions = createAssetResolutions(assetDeclarations);
  const entryScene = resolveEntryScene(projectRoot, entrySceneModule);
  const variants = new AssetVariantCompiler(projectRoot, assetResolutions);
  const sceneDescriptor = snapshotScene(projectRoot, entrySceneModule.sceneFile, entryScene.scene);

  const sceneGraph = validateCompiledSceneGraph({
    version: 1,
    id: entryScene.id,
    entities: sceneDescriptor.entities.map((entityDescriptor, index) =>
      compileSceneEntity(variants, entityDescriptor, index),
    ),
  });
  const assetRegistry = validateAssetRegistry({
    version: 1,
    assets: variants.assets(),
  });
  const manifestInput = validateManifestInput({
    version: 1,
    entrySceneId: sceneGraph.id,
  });

  return {
    assetRegistry,
    sceneGraph,
    manifestInput,
  };
}

function createAssetResolutions(
  assetDeclarations: AssetDeclaration[],
): Map<AssetDefinition<JsonObject>, AssetResolution> {
  const declarationsByDefinition = new Map<AssetDefinition<JsonObject>, AssetDeclaration[]>();

  for (const declaration of assetDeclarations) {
    const declarations = declarationsByDefinition.get(declaration.assetDefinition) ?? [];
    declarations.push(declaration);
    declarationsByDefinition.set(declaration.assetDefinition, declarations);
  }

  const resolutions = new Map<AssetDefinition<JsonObject>, AssetResolution>();

  for (const [assetDefinition, declarations] of declarationsByDefinition) {
    if (declarations.length === 1 && declarations[0] !== undefined) {
      resolutions.set(assetDefinition, { declaration: declarations[0] });
      continue;
    }

    throw new BuildError(
      `Asset definition is exported by multiple asset IDs: ${declarations.map((declaration) => declaration.id).join(", ")}.`,
    );
  }

  return resolutions;
}

function resolveEntryScene(
  projectRoot: string,
  sceneModule: LoadedSceneModule,
): { id: string; scene: SceneDefinition } {
  const sceneDeclarations: { exportName: string; scene: SceneDefinition }[] = [];

  for (const [exportName, exportedValue] of Object.entries(sceneModule.moduleExports)) {
    if (!isSceneDefinition(exportedValue)) {
      continue;
    }

    if (exportName === "default") {
      throw new BuildError(
        `Scene definition from ${formatProjectPath(projectRoot, sceneModule.sceneFile)} must use a named export.`,
      );
    }

    sceneDeclarations.push({ exportName, scene: exportedValue });
  }

  if (sceneDeclarations.length === 0) {
    throw new BuildError(
      `Entry scene ${formatProjectPath(projectRoot, sceneModule.sceneFile)} must export a defineScene(...) declaration.`,
    );
  }

  if (sceneDeclarations.length > 1) {
    throw new BuildError(
      `Entry scene ${formatProjectPath(projectRoot, sceneModule.sceneFile)} must export exactly one defineScene(...) declaration. Found: ${sceneDeclarations.map((declaration) => declaration.exportName).join(", ")}.`,
    );
  }

  const sceneDeclaration = sceneDeclarations[0];

  if (sceneDeclaration === undefined) {
    throw new BuildError(
      `Entry scene ${formatProjectPath(projectRoot, sceneModule.sceneFile)} must export a defineScene(...) declaration.`,
    );
  }

  return {
    id: `${formatProjectPath(projectRoot, sceneModule.sceneFile)}:${sceneDeclaration.exportName}`,
    scene: sceneDeclaration.scene,
  };
}

function snapshotScene(
  projectRoot: string,
  sceneFile: string,
  scene: SceneDefinition,
): ReturnType<SceneDefinition["toDescriptor"]> {
  try {
    return scene.toDescriptor();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BuildError(
      `Entry scene ${formatProjectPath(projectRoot, sceneFile)} failed to produce scene metadata: ${detail}`,
    );
  }
}

function compileSceneEntity(
  variants: AssetVariantCompiler,
  entityDescriptor: EntityDescriptor,
  index: number,
) {
  validateEntityProps(entityDescriptor, index);

  const variant = variants.resolve(entityDescriptor.assetDefinition, entityDescriptor.props, index);

  return {
    assetId: variant.assetId,
    props: cloneJsonValue(entityDescriptor.props),
    transform: entityDescriptor.transform,
  };
}

function validateEntityProps(entityDescriptor: EntityDescriptor, index: number): void {
  if (!isPlainJsonObject(entityDescriptor.props)) {
    throw new BuildError(`Scene entity ${index} props must be a plain JSON object.`);
  }

  try {
    validateJsonValue(entityDescriptor.props, "props");
  } catch (error) {
    if (error instanceof TypeError) {
      const invalidPath = error.message.replace(/ must be JSON-safe\.$/, "");
      throw new BuildError(`Scene entity ${index} has non-JSON props at ${invalidPath}.`);
    }

    throw error;
  }
}

class AssetVariantCompiler {
  readonly #projectRoot: string;
  readonly #assetResolutions: Map<AssetDefinition<JsonObject>, AssetResolution>;
  readonly #variantsByKey = new Map<string, AssetVariant>();
  readonly #variants: AssetVariant[] = [];
  #nextVariantNumber = 1;

  constructor(
    projectRoot: string,
    assetResolutions: Map<AssetDefinition<JsonObject>, AssetResolution>,
  ) {
    this.#projectRoot = projectRoot;
    this.#assetResolutions = assetResolutions;
  }

  resolve(
    assetDefinition: AssetDefinition<JsonObject>,
    props: JsonObject,
    entityIndex: number,
  ): AssetVariant {
    const resolution = this.#assetResolutions.get(assetDefinition);

    if (resolution === undefined) {
      throw new BuildError(
        `Scene entity ${entityIndex} references an unresolved asset definition.`,
      );
    }

    const key = `${resolution.declaration.id}\0${canonicalJsonStringify(props)}`;
    const existingVariant = this.#variantsByKey.get(key);

    if (existingVariant !== undefined) {
      return existingVariant;
    }

    const assetId = `${resolution.declaration.id}#variant-${this.#nextVariantNumber}`;
    this.#nextVariantNumber += 1;
    const asset = compileAssetVariant(this.#projectRoot, resolution.declaration, props, assetId);
    const variant = { asset, assetId };

    this.#variantsByKey.set(key, variant);
    this.#variants.push(variant);

    return variant;
  }

  assets(): CompiledAsset[] {
    return this.#variants
      .map((variant) => variant.asset)
      .toSorted((left, right) => left.id.localeCompare(right.id));
  }
}

function canonicalJsonStringify(value: JsonValue): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (isPlainJsonObject(value)) {
    const sortedObject: Record<string, JsonValue> = {};

    for (const key of Object.keys(value).toSorted()) {
      const item = value[key];

      if (item !== undefined) {
        sortedObject[key] = sortJsonValue(item);
      }
    }

    return sortedObject;
  }

  return value;
}
