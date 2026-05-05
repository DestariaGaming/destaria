import { describe, expect, it } from "bun:test";
import { TestHarness } from "cli-forge";

import { createDestariaCli } from "./cli";
import { defineAsset, entity, Mesh, destaria, version } from "./index";
import { captureConsole } from "./shared/test/fixtures";

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

  it("re-exports the authoring entity api", () => {
    const Crate = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(entity(Crate).toDescriptor()).toEqual({
      assetDefinition: Crate,
      props: {},
      transform: {
        position: { x: 0, y: 0, z: 0 },
      },
    });
  });
});

describe("destaria cli", () => {
  it.each(["create", "dev", "build", "list", "package"] as const)("routes %s", async (command) => {
    const harness = new TestHarness(createDestariaCli());
    const { commandChain } = await harness.parse([command]);

    expect(commandChain).toEqual([command]);
  });

  it("prints help with the skeleton commands", async () => {
    const output = captureConsole("log", async () => {
      await createDestariaCli().forge(["--help"]);
    });

    await expect(output).resolves.toContain("create");
    await expect(output).resolves.toContain("dev");
    await expect(output).resolves.toContain("build");
    await expect(output).resolves.toContain("list");
    await expect(output).resolves.toContain("package");
  });
});
