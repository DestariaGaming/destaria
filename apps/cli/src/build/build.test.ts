import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProject } from "./index";
import { createFixtureProject } from "../shared/test-fixtures";

describe("destaria build", () => {
  it("builds one primitive asset into an asset registry", async () => {
    const projectRoot = await createFixtureProject({
      "src/assets/crate.asset.ts": `
        import { defineAsset, Mesh } from "destaria";

        export const Crate = defineAsset({
          mesh() {
            return Mesh.cube();
          },
        });
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
          import { defineAsset, Mesh } from "destaria";

          export const Zebra = defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });
        `,
        "src/assets/nested/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          export const Crate = defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });
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

  it("reports default exported asset definitions", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          export default defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });
        `,
      },
      "project-default-asset",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Asset definition from src/assets/crate.asset.ts must use a named export.",
    );
  });

  it("reports invalid mesh descriptors", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset } from "destaria";

          export const Crate = defineAsset({
            mesh() {
              return {
                kind: "primitive",
                primitive: "sphere",
              };
            },
          });
        `,
      },
      "project-invalid-mesh",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts has an invalid mesh descriptor',
    );
  });

  it("compiles alias exports as separate asset identities", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          const CrateDefinition = defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });

          export { CrateDefinition as Crate, CrateDefinition as DuplicateCrate };
        `,
      },
      "project-alias-assets",
    );

    const result = await buildProject({ projectRoot });

    expect(result.registry.assets.map((asset) => asset.id)).toEqual([
      "src/assets/crate.asset.ts:Crate",
      "src/assets/crate.asset.ts:DuplicateCrate",
    ]);
  });

  it("uses default props for the temporary discovered asset build proof", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          type CrateProps = {
            size: "small" | "large";
            isExplosive: boolean;
          };

          export const Crate = defineAsset<CrateProps>({
            defaultProps: {
              size: "large",
              isExplosive: false,
            },
            mesh(props) {
              return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
            },
          });
        `,
      },
      "project-prop-asset",
    );

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      registry: {
        assets: [
          {
            id: "src/assets/crate.asset.ts:Crate",
            mesh: {
              kind: "primitive",
              primitive: "cube",
              size: 4,
            },
          },
        ],
      },
    });
  });

  it("detects asset definitions by marker rather than package instance", async () => {
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
      },
      {
        projectName: "project-definition-marker-copy",
        destariaShim: `
          export function defineAsset(options) {
            return {
              __destariaAssetDefinition: true,
              defaultProps: options.defaultProps ?? {},
              mesh: options.mesh,
            };
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

  it("reports non-json default props", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          export const Crate = {
            __destariaAssetDefinition: true,
            defaultProps: {
              size: Number.NaN,
            },
            mesh() {
              return { kind: "primitive", primitive: "cube" };
            },
          };
        `,
      },
      "project-non-json-default-props",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts has non-JSON default props at defaultProps.size.',
    );
  });

  it("reports mesh callback failures", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset } from "destaria";

          export const Crate = defineAsset({
            mesh() {
              throw new Error("boom");
            },
          });
        `,
      },
      "project-mesh-callback-failure",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts failed to produce mesh metadata: boom',
    );
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
