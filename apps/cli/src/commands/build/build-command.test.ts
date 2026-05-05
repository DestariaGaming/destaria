import { describe, expect, it } from "bun:test";
import path from "node:path";

import { createFixtureProject } from "../../shared/test/fixtures";

describe("destaria build command", () => {
  it("builds a project and reports the output path", async () => {
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
      "command-project",
    );

    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "..", "bin.ts"),
        "build",
        "--project",
        projectRoot,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(result.stdout).text();

    expect(await result.exited).toBe(0);
    expect(output).toContain(`${projectRoot}/dist/asset-registry.json`);
  });

  it("prints build errors and sets a failing exit code", async () => {
    const projectRoot = await createFixtureProject({}, "command-invalid-output");
    const result = Bun.spawn({
      cmd: [
        "bun",
        path.join(import.meta.dir, "..", "..", "bin.ts"),
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
