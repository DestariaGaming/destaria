import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createDestariaCli } from "../cli";
import { captureConsole, createFixtureProject } from "../shared/test-fixtures";

describe("destaria build command", () => {
  it("builds a project and reports the output path", async () => {
    const projectRoot = await createFixtureProject(
      {
        "src/assets/crate.asset.ts": `
          import { Asset, Mesh } from "destaria";

          export class Crate extends Asset {
            static mesh = Mesh.cube();
          }
        `,
      },
      "command-project",
    );

    const output = await captureConsole("log", async () => {
      await createDestariaCli().forge(["build", "--project", projectRoot]);
    });

    expect(output).toContain(`${projectRoot}/dist/asset-registry.json`);
  });

  it("prints build errors and sets a failing exit code", async () => {
    const projectRoot = await createFixtureProject({}, "command-invalid-output");
    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "bin.ts"),
        "build",
        "--project",
        projectRoot,
        "--output",
        "../asset-registry.json",
      ],
      stderr: "pipe",
      stdout: "pipe",
    });
    const stderr = await new Response(result.stderr).text();

    expect(await result.exited).toBe(1);
    expect(stderr).toContain("Build output must stay inside the project root.");
  });
});
