import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProject } from "./build";
import { createFixtureProject } from "../../shared/test/fixtures";

describe("destaria build", () => {
  it("compiles the entry scene into package-ready in-memory data", async () => {
    const projectRoot = await createFixtureProject({
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
    });

    const result = await buildProject({ projectRoot });
    const registry = JSON.parse(await readFile(result.outputFile, "utf8"));

    expect(result.assetRegistry).toEqual({
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
    });
    expect(result.sceneGraph).toEqual({
      version: 1,
      id: "src/scenes/main.scene.ts:MainScene",
      entities: [
        {
          assetId: "src/assets/crate.asset.ts:Crate#variant-1",
          props: {},
          transform: {
            position: { x: 1, y: 2, z: 3 },
          },
        },
      ],
    });
    expect(result.manifestInput).toEqual({
      version: 1,
      entrySceneId: "src/scenes/main.scene.ts:MainScene",
    });
    expect(registry).toEqual(result.assetRegistry);
  });

  it("compiles only asset variants referenced by the entry scene", async () => {
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
        "src/assets/unused.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          export const Unused = defineAsset({
            mesh() {
              return Mesh.cube({ size: 9 });
            },
          });
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate)],
          });
        `,
      },
      "project-referenced-assets",
    );

    const result = await buildProject({ projectRoot });

    expect(result.assetRegistry.assets.map((asset) => asset.id)).toEqual([
      "src/assets/crate.asset.ts:Crate#variant-1",
    ]);
  });

  it("builds an empty asset registry and scene graph when the entry scene has no entities", async () => {
    const projectRoot = await createFixtureProject({}, "project-empty-assets");

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      assetRegistry: {
        version: 1,
        assets: [],
      },
      sceneGraph: {
        version: 1,
        id: "src/scenes/main.scene.ts:MainScene",
        entities: [],
      },
    });
  });

  it("uses effective entity props for prop-sensitive mesh output", async () => {
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
              size: "small",
              isExplosive: false,
            },
            mesh(props) {
              return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
            },
          });
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate).with({ size: "large", isExplosive: true })],
          });
        `,
      },
      "project-prop-asset",
    );

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      assetRegistry: {
        assets: [
          {
            id: "src/assets/crate.asset.ts:Crate#variant-1",
            mesh: {
              kind: "primitive",
              primitive: "cube",
              size: 4,
            },
          },
        ],
      },
      sceneGraph: {
        entities: [
          {
            assetId: "src/assets/crate.asset.ts:Crate#variant-1",
            props: {
              size: "large",
              isExplosive: true,
            },
          },
        ],
      },
    });
  });

  it("reuses compiled variants for identical effective props", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          type CrateProps = { size: "small" | "large" };

          export const Crate = defineAsset<CrateProps>({
            defaultProps: { size: "small" },
            mesh(props) {
              return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
            },
          });
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [
              entity(Crate).with({ size: "large" }).at(1, 0, 0),
              entity(Crate).with({ size: "large" }).at(2, 0, 0),
            ],
          });
        `,
      },
      "project-reused-variant",
    );

    const result = await buildProject({ projectRoot });

    expect(result.assetRegistry.assets.map((asset) => asset.id)).toEqual([
      "src/assets/crate.asset.ts:Crate#variant-1",
    ]);
    expect(result.sceneGraph.entities.map((entity) => entity.assetId)).toEqual([
      "src/assets/crate.asset.ts:Crate#variant-1",
      "src/assets/crate.asset.ts:Crate#variant-1",
    ]);
  });

  it("compiles different effective props as different variants", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { defineAsset, Mesh } from "destaria";

          type CrateProps = { size: "small" | "large" };

          export const Crate = defineAsset<CrateProps>({
            defaultProps: { size: "small" },
            mesh(props) {
              return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
            },
          });
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [
              entity(Crate),
              entity(Crate).with({ size: "large" }),
            ],
          });
        `,
      },
      "project-distinct-variants",
    );

    const result = await buildProject({ projectRoot });

    expect(result.assetRegistry.assets).toEqual([
      {
        id: "src/assets/crate.asset.ts:Crate#variant-1",
        mesh: {
          kind: "primitive",
          primitive: "cube",
          size: 2,
        },
      },
      {
        id: "src/assets/crate.asset.ts:Crate#variant-2",
        mesh: {
          kind: "primitive",
          primitive: "cube",
          size: 4,
        },
      },
    ]);
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
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate)],
          });
        `,
      },
      "project-invalid-mesh",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts has an invalid mesh descriptor',
    );
  });

  it("reports ambiguous asset definition aliases", async () => {
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
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate)],
          });
        `,
      },
      "project-alias-assets",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Asset definition is exported by multiple asset IDs: src/assets/crate.asset.ts:Crate, src/assets/crate.asset.ts:DuplicateCrate.",
    );
  });

  it("detects asset and scene definitions by marker rather than package instance", async () => {
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
            entities: [entity(Crate)],
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

          export function defineScene(options) {
            return {
              __destariaSceneDefinition: true,
              entities: options.entities,
              toDescriptor() {
                return {
                  entities: options.entities.map((entry) => entry.toDescriptor()),
                };
              },
            };
          }

          export function entity(assetDefinition) {
            return {
              toDescriptor() {
                return {
                  assetDefinition,
                  props: assetDefinition.defaultProps,
                  transform: {
                    position: { x: 0, y: 0, z: 0 },
                  },
                };
              },
            };
          }

          export const Mesh = {
            cube() {
              return { kind: "primitive", primitive: "cube" };
            },
          };

          export function defineConfig(config) {
            return {
              ...config,
              __destariaConfigDefinition: true,
            };
          }
        `,
      },
    );

    await expect(buildProject({ projectRoot })).resolves.toMatchObject({
      assetRegistry: {
        assets: [
          {
            id: "src/assets/crate.asset.ts:Crate#variant-1",
          },
        ],
      },
    });
  });

  it("reports unresolved asset definitions referenced by scenes", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/scenes/main.scene.ts": `
          import { defineAsset, defineScene, entity, Mesh } from "destaria";

          const InlineCrate = defineAsset({
            mesh() {
              return Mesh.cube();
            },
          });

          export const MainScene = defineScene({
            entities: [entity(InlineCrate)],
          });
        `,
      },
      "project-unresolved-asset",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Scene entity 0 references an unresolved asset definition.",
    );
  });

  it("reports non-json entity props", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          export const Crate = {
            __destariaAssetDefinition: true,
            defaultProps: {},
            mesh() {
              return { kind: "primitive", primitive: "cube" };
            },
          };
        `,
        "src/scenes/main.scene.ts": `
          import { defineScene } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [
              {
                toDescriptor() {
                  return {
                    assetDefinition: Crate,
                    props: { createdAt: new Date() },
                    transform: {
                      position: { x: 0, y: 0, z: 0 },
                    },
                  };
                },
              },
            ],
          });
        `,
      },
      "project-non-json-entity-props",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Scene entity 0 has non-JSON props at props.createdAt.",
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
        "src/scenes/main.scene.ts": `
          import { defineScene, entity } from "destaria";
          import { Crate } from "../assets/crate.asset";

          export const MainScene = defineScene({
            entities: [entity(Crate)],
          });
        `,
      },
      "project-mesh-callback-failure",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      'Asset "src/assets/crate.asset.ts:Crate" from src/assets/crate.asset.ts failed to produce mesh metadata: boom',
    );
  });

  it("reports invalid entry scene exports", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/scenes/main.scene.ts": `
          import { defineScene } from "destaria";

          export default defineScene({
            entities: [],
          });
        `,
      },
      "project-default-scene",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Scene definition from src/scenes/main.scene.ts must use a named export.",
    );
  });

  it("reports ambiguous entry scene exports", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/scenes/main.scene.ts": `
          import { defineScene } from "destaria";

          export const MainScene = defineScene({
            entities: [],
          });
          export const AlternateScene = defineScene({
            entities: [],
          });
        `,
      },
      "project-ambiguous-scene",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Entry scene src/scenes/main.scene.ts must export exactly one defineScene(...) declaration. Found: AlternateScene, MainScene.",
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

  it("reports scene module import failures", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/scenes/main.scene.ts": `
          throw new Error("boom");
        `,
      },
      "project-broken-scene-module",
    );

    await expect(buildProject({ projectRoot })).rejects.toThrow(
      "Failed to load scene module src/scenes/main.scene.ts: boom",
    );
  });
});
