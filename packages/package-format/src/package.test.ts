import { describe, expect, it } from "bun:test";
import { z } from "zod";

import {
  PACKAGE_ASSET_REGISTRY_FILE,
  PACKAGE_MANIFEST_FILE,
  PACKAGE_SCENE_FILE,
  validatePackageContents,
} from "./package";

function createPackageContents() {
  return {
    manifest: {
      version: 1 as const,
      entrySceneId: "src/scenes/main.scene.ts:MainScene",
    },
    scene: {
      version: 1 as const,
      id: "src/scenes/main.scene.ts:MainScene",
      entities: [
        {
          assetId: "src/assets/crate.asset.ts:Crate#variant-1",
          props: {},
          transform: {
            position: { x: 0, y: 0, z: 0 },
          },
        },
      ],
    },
    assetRegistry: {
      version: 1 as const,
      assets: [
        {
          id: "src/assets/crate.asset.ts:Crate#variant-1",
          mesh: {
            kind: "primitive" as const,
            primitive: "cube" as const,
          },
        },
      ],
    },
  };
}

describe("aggregate package format", () => {
  it("defines the minimal package entry names", () => {
    expect([PACKAGE_MANIFEST_FILE, PACKAGE_SCENE_FILE, PACKAGE_ASSET_REGISTRY_FILE]).toEqual([
      "manifest.json",
      "scene.json",
      "asset-registry.json",
    ]);
  });

  it("accepts complete package contents", () => {
    const contents = createPackageContents();

    expect(validatePackageContents(contents)).toEqual(contents);
  });

  it("rejects invalid package files", () => {
    const contents = createPackageContents();

    expect(() =>
      validatePackageContents({
        ...contents,
        manifest: {
          ...contents.manifest,
          version: 2 as 1,
        },
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects a manifest that references a different entry scene", () => {
    const contents = createPackageContents();

    expect(() =>
      validatePackageContents({
        ...contents,
        manifest: {
          ...contents.manifest,
          entrySceneId: "src/scenes/other.scene.ts:OtherScene",
        },
      }),
    ).toThrow(
      'Package manifest entry scene "src/scenes/other.scene.ts:OtherScene" does not match packaged scene "src/scenes/main.scene.ts:MainScene".',
    );
  });

  it("rejects duplicate asset IDs", () => {
    const contents = createPackageContents();

    expect(() =>
      validatePackageContents({
        ...contents,
        assetRegistry: {
          ...contents.assetRegistry,
          assets: [...contents.assetRegistry.assets, contents.assetRegistry.assets[0]!],
        },
      }),
    ).toThrow(
      'Package asset registry contains duplicate asset ID "src/assets/crate.asset.ts:Crate#variant-1".',
    );
  });

  it("rejects missing asset references", () => {
    const contents = createPackageContents();

    expect(() =>
      validatePackageContents({
        ...contents,
        assetRegistry: {
          ...contents.assetRegistry,
          assets: [],
        },
      }),
    ).toThrow(
      'Package scene entity 0 references missing asset ID "src/assets/crate.asset.ts:Crate#variant-1".',
    );
  });
});
