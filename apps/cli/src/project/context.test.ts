import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createDestariaCli } from "../cli";
import { getProjectContext, loadProjectContext } from "./context";
import { captureConsole, createFixtureProject } from "../shared/test/fixtures";

describe("project context", () => {
  it("loads destaria.config.ts and normalizes effective paths", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-load",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "scenes/intro.scene.ts",
            source: {
              root: "src",
            },
            output: {
              dir: "build",
            },
          });
        `,
      },
    );

    const context = await loadProjectContext({ projectRoot });

    expect(context).toMatchObject({
      projectRoot,
      configFile: path.join(projectRoot, "destaria.config.ts"),
      sourceRoot: path.join(projectRoot, "src"),
      entryScene: path.join(projectRoot, "src/scenes/intro.scene.ts"),
      outputDir: path.join(projectRoot, "build"),
      assetRegistryOutputFile: path.join(projectRoot, "build/asset-registry.json"),
    });
  });

  it("defaults source.root to src and resolves entry relative to it", async () => {
    const projectRoot = await createFixtureProject({}, "project-context-default-source-root");

    await expect(loadProjectContext({ projectRoot })).resolves.toMatchObject({
      sourceRoot: path.join(projectRoot, "src"),
      entryScene: path.join(projectRoot, "src/scenes/main.scene.ts"),
    });
  });

  it("resolves a custom source.root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-custom-source-root",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: "game",
            },
            entry: "levels/boss/boss.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).resolves.toMatchObject({
      sourceRoot: path.join(projectRoot, "game"),
      entryScene: path.join(projectRoot, "game/levels/boss/boss.scene.ts"),
    });
  });

  it("allows source.root to be the project root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-project-source-root",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: ".",
            },
            entry: "main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).resolves.toMatchObject({
      sourceRoot: projectRoot,
      entryScene: path.join(projectRoot, "main.scene.ts"),
    });
  });

  it("merges the output override into the effective project context", async () => {
    const projectRoot = await createFixtureProject({}, "project-context-output-override");

    await expect(
      loadProjectContext({
        projectRoot,
        outputFile: "tmp/registry.json",
      }),
    ).resolves.toMatchObject({
      assetRegistryOutputFile: path.join(projectRoot, "tmp/registry.json"),
    });
  });

  it("reports a missing config file", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-missing-config",
        config: false,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "Missing Destaria config file: destaria.config.ts",
    );
  });

  it("reports configs that do not default export defineConfig", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-invalid-export",
        config: `
          export default {
            entry: "src/scenes/main.scene.ts",
            output: {
              dir: "dist",
            },
          };
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "destaria.config.ts must default export defineConfig(...).",
    );
  });

  it("rejects entry paths that are not scene modules", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-non-scene-entry",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "main.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "Config entry must reference a .scene.ts file.",
    );
  });

  it("rejects config paths outside the project root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-escaping-entry",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "../main.scene.ts",
            source: {
              root: "src",
            },
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "Config entry must stay inside the source root.",
    );
  });

  it("rejects source.root paths outside the project root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-escaping-source-root",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            source: {
              root: "../src",
            },
            entry: "main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "Config source.root must stay inside the project root.",
    );
  });

  it("memoizes the injected context for a command invocation", async () => {
    const projectRoot = await createFixtureProject({}, "project-context-memoized-provider");
    const cli = createDestariaCli().command("inspect-context", {
      description: "Inspect project context",
      handler: async () => {
        const first = await getProjectContext();
        const second = await getProjectContext();

        console.log(first === second ? "same" : "different");
      },
    });

    const output = await captureConsole("log", async () => {
      await cli.forge(["--project", projectRoot, "inspect-context"]);
    });

    expect(output).toBe("same");
  });
});
