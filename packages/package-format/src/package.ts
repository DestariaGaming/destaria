import type { AssetRegistry } from "./asset";
import { validateAssetRegistry } from "./asset";
import type { PackageManifest } from "./manifest";
import { validatePackageManifest } from "./manifest";
import type { CompiledSceneGraph } from "./scene";
import { validateCompiledSceneGraph } from "./scene";
import { z } from "zod";

/** Archive entry containing the package manifest. */
export const PACKAGE_MANIFEST_FILE = "manifest.json";

/** Archive entry containing the compiled entry scene. */
export const PACKAGE_SCENE_FILE = "scene.json";

/** Archive entry containing compiled asset metadata. */
export const PACKAGE_ASSET_REGISTRY_FILE = "asset-registry.json";

/** Complete structured data written into a minimal Destaria package. */
export type PackageContents = {
  manifest: PackageManifest;
  scene: CompiledSceneGraph;
  assetRegistry: AssetRegistry;
};

/** Validates package files and the references between them. */
export function validatePackageContents(value: unknown): PackageContents {
  const packageFiles = z
    .object({
      manifest: z.unknown(),
      scene: z.unknown(),
      assetRegistry: z.unknown(),
    })
    .strict()
    .parse(value);
  const contents = {
    manifest: validatePackageManifest(packageFiles.manifest),
    scene: validateCompiledSceneGraph(packageFiles.scene),
    assetRegistry: validateAssetRegistry(packageFiles.assetRegistry),
  };

  if (contents.manifest.entrySceneId !== contents.scene.id) {
    throw new TypeError(
      `Package manifest entry scene "${contents.manifest.entrySceneId}" does not match packaged scene "${contents.scene.id}".`,
    );
  }

  const assetIds = new Set<string>();

  for (const asset of contents.assetRegistry.assets) {
    if (assetIds.has(asset.id)) {
      throw new TypeError(`Package asset registry contains duplicate asset ID "${asset.id}".`);
    }

    assetIds.add(asset.id);
  }

  for (const [index, entity] of contents.scene.entities.entries()) {
    if (!assetIds.has(entity.assetId)) {
      throw new TypeError(
        `Package scene entity ${index} references missing asset ID "${entity.assetId}".`,
      );
    }
  }

  return contents;
}
