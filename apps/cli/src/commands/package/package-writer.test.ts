import { describe, expect, it } from "bun:test";
import { rm } from "node:fs/promises";
import path from "node:path";

import type { PackageContents } from "@destaria/package-format";

import { writePackage } from "./package-writer";

const outputRoot = path.join(import.meta.dir, "..", "..", "..", "..", "..", "tmp");

function createPackageContents(): PackageContents {
  return {
    manifest: {
      version: 1,
      entrySceneId: "src/scenes/main.scene.ts:MainScene",
    },
    scene: {
      version: 1,
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
      version: 1,
      assets: [
        {
          id: "src/assets/crate.asset.ts:Crate#variant-1",
          mesh: {
            kind: "primitive",
            primitive: "cube",
          },
        },
      ],
    },
  };
}

describe("package writer", () => {
  it("writes the minimal package files into an uncompressed archive", async () => {
    const outputFile = path.join(outputRoot, "package-writer", "game.destariapkg");
    const contents = createPackageContents();
    await rm(path.dirname(outputFile), { recursive: true, force: true });

    await writePackage(outputFile, contents);

    const archive = new Bun.Archive(await Bun.file(outputFile).bytes());
    const files = await archive.files();

    expect([...files.keys()].toSorted()).toEqual([
      "asset-registry.json",
      "manifest.json",
      "scene.json",
    ]);
    expect(JSON.parse(await files.get("manifest.json")!.text())).toEqual(contents.manifest);
    expect(JSON.parse(await files.get("scene.json")!.text())).toEqual(contents.scene);
    expect(JSON.parse(await files.get("asset-registry.json")!.text())).toEqual(
      contents.assetRegistry,
    );
  });

  it("reports invalid package contents before writing", async () => {
    const outputFile = path.join(outputRoot, "package-writer-invalid", "game.destariapkg");
    const contents = createPackageContents();

    await expect(
      writePackage(outputFile, {
        ...contents,
        assetRegistry: {
          ...contents.assetRegistry,
          assets: [],
        },
      }),
    ).rejects.toThrow(
      'Invalid package output: Package scene entity 0 references missing asset ID "src/assets/crate.asset.ts:Crate#variant-1".',
    );
  });
});
