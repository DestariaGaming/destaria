import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createFixtureProject } from "../../shared/test/fixtures";

describe("destaria package command", () => {
  it("packages a project and reports the output path", async () => {
    const projectRoot = await createFixtureProject({}, "package-command-project");
    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "..", "bin.ts"),
        "package",
        "--project",
        projectRoot,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(result.stdout).text();

    expect(await result.exited).toBe(0);
    expect(output).toContain(`${projectRoot}/dist/game.destariapkg`);
  });

  it("reports package metadata as JSON", async () => {
    const projectRoot = await createFixtureProject({}, "package-command-json");
    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "..", "bin.ts"),
        "package",
        "--project",
        projectRoot,
        "--json",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = JSON.parse(await new Response(result.stdout).text());

    expect(await result.exited).toBe(0);
    expect(output).toMatchObject({
      ok: true,
      data: {
        outputFile: `${projectRoot}/dist/game.destariapkg`,
        manifest: {
          version: 1,
          entrySceneId: "src/scenes/main.scene.ts:MainScene",
        },
      },
    });
  });

  it("prints package errors and sets a failing exit code", async () => {
    const projectRoot = await createFixtureProject({}, "package-command-invalid-output");
    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "..", "bin.ts"),
        "package",
        "--project",
        projectRoot,
        "--output",
        "dist/game.tar",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(result.stderr).text();

    expect(await result.exited).toBe(1);
    expect(stderr).toContain("Package output must use the .destariapkg extension.");
  });
});
