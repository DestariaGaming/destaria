import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createDestariaCli } from "./cli";
import { getProjectContext, loadProjectContext } from "./project-context";
import { captureConsole, createFixtureProject } from "./shared/test-fixtures";

describe("project context", () => {
  it("loads destaria.config.ts and normalizes effective paths", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-load",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "src/scenes/intro.scene.ts",
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
      entryScene: path.join(projectRoot, "src/scenes/intro.scene.ts"),
      outputDir: path.join(projectRoot, "build"),
      assetRegistryOutputFile: path.join(projectRoot, "build/asset-registry.json"),
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

  it("rejects config paths outside the project root", async () => {
    const projectRoot = await createFixtureProject(
      {},
      {
        projectName: "project-context-escaping-entry",
        config: `
          import { defineConfig } from "destaria";

          export default defineConfig({
            entry: "../main.scene.ts",
            output: {
              dir: "dist",
            },
          });
        `,
      },
    );

    await expect(loadProjectContext({ projectRoot })).rejects.toThrow(
      "Config entry must stay inside the project root.",
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
