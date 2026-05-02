import { describe, expect, it } from "bun:test";

import { Mesh } from "./mesh";

describe("Mesh", () => {
  it("creates a default cube descriptor", () => {
    expect(Mesh.cube()).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
  });

  it("creates a cube descriptor with size", () => {
    expect(Mesh.cube({ size: 2 })).toEqual({
      kind: "primitive",
      primitive: "cube",
      size: 2,
    });
  });

  it("rejects invalid cube size", () => {
    expect(() => Mesh.cube({ size: 0 })).toThrow();
  });
});
