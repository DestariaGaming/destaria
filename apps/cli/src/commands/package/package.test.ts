import { describe, expect, it } from "bun:test";
import path from "node:path";

import { packageProject } from "./package";
import { createFixtureProject } from "../../shared/test/fixtures";

describe("destaria package", () => {
  it("compiles and writes a package artifact", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          export const Crate = defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate).at(1, 2, 3)],
          });
        `,
      },
      "package-project",
    );

    const result = await packageProject({ projectRoot });
    const files = await new Bun.Archive(await Bun.file(result.outputFile).bytes()).files();

    expect(result.outputFile).toBe(path.join(projectRoot, "dist/game.destariapkg"));
    expect([...files.keys()].toSorted()).toEqual([
      "asset-registry.json",
      "manifest.json",
      "scene.json",
    ]);
    expect(JSON.parse(await files.get("manifest.json")!.text())).toEqual({
      version: 1,
      entrySceneId: "src/scenes/main.scene.ts:MainScene",
    });
    expect(JSON.parse(await files.get("scene.json")!.text())).toEqual(result.contents.scene);
    expect(JSON.parse(await files.get("asset-registry.json")!.text())).toEqual(
      result.contents.assetRegistry,
    );
    expect([...files.keys()].some((file) => file.endsWith(".ts"))).toBe(false);
  });

  it("writes a custom package output inside the project", async () => {
    const projectRoot = await createFixtureProject({}, "package-custom-output");

    await expect(
      packageProject({
        projectRoot,
        outputFile: "releases/demo.destariapkg",
      }),
    ).resolves.toMatchObject({
      outputFile: path.join(projectRoot, "releases/demo.destariapkg"),
    });
  });

  it("rejects package outputs without the package extension", async () => {
    const projectRoot = await createFixtureProject({}, "package-invalid-extension");

    await expect(
      packageProject({
        projectRoot,
        outputFile: "dist/game.tar",
      }),
    ).rejects.toThrow("Package output must use the .destariapkg extension.");
  });

  it("rejects package output paths outside the project", async () => {
    const projectRoot = await createFixtureProject({}, "package-escaping-output");

    await expect(
      packageProject({
        projectRoot,
        outputFile: "../game.destariapkg",
      }),
    ).rejects.toThrow("Output must stay inside the project root.");
  });
});
