import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { validateManifestInput } from "./manifest";

describe("manifest package format", () => {
  it("accepts manifest input data", () => {
    expect(
      validateManifestInput({
        version: 1,
        entrySceneId: "src/scenes/main.scene.ts:MainScene",
      }),
    ).toEqual({
      version: 1,
      entrySceneId: "src/scenes/main.scene.ts:MainScene",
    });
  });

  it("rejects unsupported manifest input data", () => {
    expect(() =>
      validateManifestInput({
        version: 2,
        entrySceneId: "src/scenes/main.scene.ts:MainScene",
      }),
    ).toThrow(z.ZodError);
  });
});
