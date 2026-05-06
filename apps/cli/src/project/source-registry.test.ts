import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createDestariaCli } from "../cli";
import { loadProjectContext } from "./context";
import { discoverSourceRegistry, getSourceRegistry } from "./source-registry";
import { captureConsole, createFixtureProject } from "../shared/test/fixtures";

describe("source registry", () => {
  it("discovers colocated assets and scenes in deterministic order", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/levels/boss/zebra.asset.ts": "",
        "src/levels/boss/boss.scene.ts": "",
        "src/levels/boss/boss-minion.asset.ts": "",
      },
      {
        projectName: "source-registry-colocated",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "levels/boss/boss.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });
    const sourceRegistry = await discoverSourceRegistry(projectContext);

    expect(sourceRegistry).toEqual({
      entrySceneFile: path.join(projectRoot, "src/levels/boss/boss.scene.ts"),
      assetFiles: [
        path.join(projectRoot, "src/levels/boss/boss-minion.asset.ts"),
        path.join(projectRoot, "src/levels/boss/zebra.asset.ts"),
      ],
      sceneFiles: [path.join(projectRoot, "src/levels/boss/boss.scene.ts")],
    });
  });

  it("reports a missing source root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "source-registry-missing-source-root",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: "game",
            },
            entry: "main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });

    await expect(discoverSourceRegistry(projectContext)).rejects.toThrow(
      "Missing source root: game",
    );
  });

  it("reports a missing entry scene", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/levels/boss/boss.asset.ts": "",
      },
      {
        projectName: "source-registry-missing-entry-scene",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "levels/boss/boss.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });

    await expect(discoverSourceRegistry(projectContext)).rejects.toThrow(
      "Missing entry scene: src/levels/boss/boss.scene.ts",
    );
  });

  it("uses the root .gitignore to skip ignored source files and directories", async () => {
    const projectRoot = await createFixtureProject(
      {
        ".gitignore": ["dist", "tmp/", "src/ignored.asset.ts", "src/nested-ignored/"].join("\n"),
        "src/valid.asset.ts": "",
        "src/main.scene.ts": "",
        "src/ignored.asset.ts": "",
        "src/nested-ignored/ignored.asset.ts": "",
        "dist/ignored.asset.ts": "",
        "tmp/ignored.scene.ts": "",
      },
      {
        projectName: "source-registry-ignored-paths",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: ".",
            },
            entry: "src/main.scene.ts",
            output: {
              dir: "generated",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });
    const sourceRegistry = await discoverSourceRegistry(projectContext);

    expect(sourceRegistry.assetFiles).toEqual([path.join(projectRoot, "src/valid.asset.ts")]);
    expect(sourceRegistry.sceneFiles).toEqual([path.join(projectRoot, "src/main.scene.ts")]);
  });

  it("skips outputDir even without a .gitignore", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/valid.asset.ts": "",
        "src/main.scene.ts": "",
        "dist/ignored.asset.ts": "",
      },
      {
        projectName: "source-registry-output-dir-skip",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: ".",
            },
            entry: "src/main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });
    const sourceRegistry = await discoverSourceRegistry(projectContext);

    expect(sourceRegistry.assetFiles).toEqual([path.join(projectRoot, "src/valid.asset.ts")]);
    expect(sourceRegistry.sceneFiles).toEqual([path.join(projectRoot, "src/main.scene.ts")]);
  });

  it("always skips .git, .repos, and node_modules directories", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/valid.asset.ts": "",
        "src/main.scene.ts": "",
        ".git/ignored.asset.ts": "",
        ".repos/reference/ignored.asset.ts": "",
        "node_modules/pkg/ignored.asset.ts": "",
      },
      {
        projectName: "source-registry-hard-skips",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: ".",
            },
            entry: "src/main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    const projectContext = await loadProjectContext({ projectRoot });
    const sourceRegistry = await discoverSourceRegistry(projectContext);

    expect(sourceRegistry.assetFiles).toEqual([path.join(projectRoot, "src/valid.asset.ts")]);
    expect(sourceRegistry.sceneFiles).toEqual([path.join(projectRoot, "src/main.scene.ts")]);
  });

  it("memoizes the injected source registry for a command invocation", async () => {
    const projectRoot = await createFixtureProject({}, "source-registry-memoized-provider");
    const cli = createDestariaCli().command("inspect-sources", {
      description: "Inspect source registry",
      handler: async () => {
        const first = await getSourceRegistry();
        const second = await getSourceRegistry();

        console.log(first === second ? "same" : "different");
      },
    });

    const output = await captureConsole("log", async () => {
      await cli.forge(["--project", projectRoot, "inspect-sources"]);
    });

    expect(output).toBe("same");
  });
});
