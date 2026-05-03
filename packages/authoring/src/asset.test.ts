import { describe, expect, it } from "bun:test";

import { Asset } from "./asset";
import { Mesh } from "./mesh";

describe("Asset", () => {
  it("supports declarative static mesh metadata", () => {
    class Crate extends Asset {
      static override mesh = Mesh.cube();
    }

    expect(Crate.mesh).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
    expect(Crate.prototype).toBeInstanceOf(Asset);
  });
});
