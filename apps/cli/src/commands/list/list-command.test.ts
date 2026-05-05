import { afterEach, describe, expect, it } from "bun:test";

import { createDestariaCli } from "../../cli";
import { captureConsole, createFixtureProject } from "../../shared/test/fixtures";

describe("destaria list command", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("lists discovered source files", async () => {
    const projectRoot = await createListFixtureProject("list-command-human");

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list"]);
    });

    expect(output).toContain("Entry scene\n  src/levels/boss/boss.scene.ts");
    expect(output).toContain("Scenes\n  src/levels/boss/boss.scene.ts");
    expect(output).toContain("Assets\n  src/levels/boss/boss-minion.asset.ts");
    expect(output).toContain("src/levels/boss/boss.asset.ts");
  });

  it("filters source files by positional types", async () => {
    const projectRoot = await createListFixtureProject("list-command-filtered");

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list", "scenes"]);
    });

    expect(output).toContain("Scenes\n  src/levels/boss/boss.scene.ts");
    expect(output).not.toContain("Assets");
    expect(output).not.toContain("boss.asset.ts");
  });

  it("lists only assets when assets are selected", async () => {
    const projectRoot = await createListFixtureProject("list-command-assets");

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list", "assets"]);
    });

    expect(output).toBe(
      ["Assets", "  src/levels/boss/boss-minion.asset.ts", "  src/levels/boss/boss.asset.ts"].join(
        "\n",
      ),
    );
  });

  it("prints only assets in json output when assets are selected", async () => {
    const projectRoot = await createListFixtureProject("list-command-assets-json");

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list", "assets", "--json"]);
    });

    expect(JSON.parse(output)).toEqual({
      ok: true,
      messages: [
        [
          "Assets",
          "  src/levels/boss/boss-minion.asset.ts",
          "  src/levels/boss/boss.asset.ts",
        ].join("\n"),
      ],
      data: {
        assets: ["src/levels/boss/boss-minion.asset.ts", "src/levels/boss/boss.asset.ts"],
      },
    });
  });

  it("prints json output when --json is provided", async () => {
    const projectRoot = await createListFixtureProject("list-command-json");

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list", "scenes", "--json"]);
    });

    expect(JSON.parse(output)).toEqual({
      ok: true,
      messages: [
        [
          "Entry scene",
          "  src/levels/boss/boss.scene.ts",
          "",
          "Scenes",
          "  src/levels/boss/boss.scene.ts",
        ].join("\n"),
      ],
      data: {
        entryScene: "src/levels/boss/boss.scene.ts",
        scenes: ["src/levels/boss/boss.scene.ts"],
      },
    });
  });

  it("reports unknown list types", async () => {
    const projectRoot = await createListFixtureProject("list-command-unknown-type");

    const output = await captureConsole("error", async () => {
      await createDestariaCli().forge(["--project", projectRoot, "list", "materials"]);
    });

    expect(output).toBe('Unknown list type "materials". Valid types: assets, scenes.');
    expect(process.exitCode).toBe(1);
  });
});

async function createListFixtureProject(projectName: string): Promise<string> {
  return await createFixtureProject(
    {
      "src/levels/boss/boss.asset.ts": "",
      "src/levels/boss/boss-minion.asset.ts": "",
      "src/levels/boss/boss.scene.ts": "",
    },
    {
      projectName,
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
}
