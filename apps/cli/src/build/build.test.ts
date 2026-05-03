import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProject } from "./index";
import { createFixtureProject } from "../shared/test-fixtures";

describe("destaria build", () => {
  it("builds one primitive asset into an asset registry", async () => {
    const projectRoot = await createFixtureProject({
      "src/assets/crate.asset.ts": `
        import { Asset, Mesh } from "destaria";

        export class Crate extends Asset {
          static mesh = Mesh.cube();
        }
      `,
    });

    const result = await buildProject({ projectRoot });
    const registry = JSON.parse(await readFile(result.outputFile, "utf8"));

    expect(result.registry).toEqual({
      version: 1,
      assets: [
        {
          id: "src/assets/crate.asset.ts:Crate",
          mesh: {
            kind: "primitive",
            primitive: "cube",
          },
        },
      ],
    });
    expect(registry).toEqual(result.registry);
  });

  it("builds nested assets in deterministic id order", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/zebra.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export class Zebra extends Asset {
            static mesh = Mesh.cube();
          }
        `,
        "src/assets/nested/crate.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export class Crate extends Asset {
            static mesh = Mesh.cube();
          }
        `,
      },
      "project-nested-assets",
    );

    const result = await buildProject({ projectRoot });

    expect(result.registry.assets.map((asset) => asset.id)).toEqual([
      "src/assets/nested/crate.asset.ts:Crate",
      "src/assets/zebra.asset.ts:Zebra",
    ]);
  });

  it("builds an empty asset registry when no asset files exist", async () => {
    const projectRoot = await createFixtureProject({}, "project-empty-assets");

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      registry: {
        version: 1,
        assets: [],
      },
    });
  });

  it("reports assets without a mesh", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset } from "destaria";

          export class Crate extends Asset {}
        `,
      },
      "project-no-mesh",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts must define a static mesh.',
    );
  });

  it("reports invalid mesh descriptors", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset } from "destaria";

          export class Crate extends Asset {
            static mesh = {
              kind: "primitive",
              primitive: "sphere",
            };
          }
        `,
      },
      "project-invalid-mesh",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts has an invalid mesh descriptor',
    );
  });

  it("reports duplicate generated asset ids with both exported locations", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export class Crate extends Asset {
            static mesh = Mesh.cube();
          }

          export { Crate as DuplicateCrate };
        `,
      },
      "project-duplicate-id",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Duplicate asset id "src/assets/crate.asset.ts:Crate" generated from src/assets/crate.asset.ts:Crate and src/assets/crate.asset.ts:DuplicateCrate.',
    );
  });

  it("rejects default exported asset classes", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export default class Crate extends Asset {
            static mesh = Mesh.cube();
          }
        `,
      },
      "project-default-asset",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Asset from src/assets/crate.asset.ts must use a named export.",
    );
  });

  it("detects asset classes by marker rather than package instance", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export class Crate extends Asset {
            static mesh = Mesh.cube();
          }
        `,
      },
      {
        projectName: "project-marker-copy",
        destariaShim: `
          export class Asset {
            static __destariaAssetClass = true;
          }

          export const Mesh = {
            cube() {
              return { kind: "primitive", primitive: "cube" };
            },
          };
        `,
      },
    );

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      registry: {
        assets: [
          {
            id: "src/assets/crate.asset.ts:Crate",
          },
        ],
      },
    });
  });

  it("rejects absolute output paths", async () => {
    const projectRoot = await createFixtureProject({}, "project-absolute-output");

    await expect(
      buildProject({ projectRoot, outputFile: path.join(projectRoot, "dist", "registry.json") }),
    ).rejects.toThrow("Build output must be relative to the project root.");
  });

  it("rejects output paths outside the project root", async () => {
    const projectRoot = await createFixtureProject({}, "project-escaping-output");

    await expect(buildProject({ projectRoot, outputFile: "../registry.json" })).rejects.toThrow(
      "Build output must stay inside the project root.",
    );
  });

  it("reports asset module import failures", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/broken.asset.ts": `
          throw new Error("boom");
        `,
      },
      "project-broken-asset-module",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Failed to load asset module src/assets/broken.asset.ts: boom",
    );
  });
});
