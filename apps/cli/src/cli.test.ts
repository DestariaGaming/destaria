import { describe, expect, it } from "bun:test";
import { TestHarness } from "cli-forge";

import { createDestariaCli } from "./cli";
import { defineAsset, Mesh, destaria, version } from "./index";

describe("destaria sdk exports", () => {
  it("exports the sdk token and version", () => {
    expect(version).toBe("0.0.1");
    expect(destaria).toEqual({
      name: "destaria",
      version: "0.0.1",
    });
  });

  it("re-exports the authoring asset api", () => {
    const Crate = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(Crate.defaultProps).toEqual({});
    expect(Crate.mesh(Crate.defaultProps)).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
  });

  it("re-exports the authoring mesh api", () => {
    expect(Mesh.cube()).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
  });
});

describe("destaria cli", () => {
  it.each(["create", "dev", "build", "package"] as const)("routes %s", async (command) => {
    const harness = new TestHarness(createDestariaCli());
    const { commandChain } = await harness.parse([command]);

    expect(commandChain).toEqual([command]);
  });

  it("prints help with the skeleton commands", async () => {
    const output = captureConsoleLog(async () => {
      await createDestariaCli().forge(["--help"]);
    });

    await expect(output).resolves.toContain("create");
    await expect(output).resolves.toContain("dev");
    await expect(output).resolves.toContain("build");
    await expect(output).resolves.toContain("package");
  });
});

async function captureConsoleLog(fn: () => Promise<void>): Promise<string> {
  const originalConsoleLog = console.log;
  const lines: string[] = [];

  console.log = (...contents) => {
    lines.push(
      contents
        .map((content) => (typeof content === "string" ? content : JSON.stringify(content)))
        .join(" "),
    );
  };

  try {
    await fn();
  } finally {
    console.log = originalConsoleLog;
  }

  return lines.join("\n");
}
