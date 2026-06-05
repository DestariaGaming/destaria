import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { validateCompiledSceneGraph } from "./scene";

describe("scene package format", () => {
  it("accepts a compiled scene graph", () => {
    expect(
      validateCompiledSceneGraph({
        version: 1,
        id: "src/scenes/main.scene.ts:MainScene",
        entities: [
          {
            assetId: "src/assets/crate.asset.ts:Crate#variant-1",
            props: {
              size: "large",
            },
            transform: {
              position: { x: 1, y: 2, z: 3 },
            },
          },
        ],
      }),
    ).toEqual({
      version: 1,
      id: "src/scenes/main.scene.ts:MainScene",
      entities: [
        {
          assetId: "src/assets/crate.asset.ts:Crate#variant-1",
          props: {
            size: "large",
          },
          transform: {
            position: { x: 1, y: 2, z: 3 },
          },
        },
      ],
    });
  });

  it("rejects invalid scene graphs", () => {
    expect(() =>
      validateCompiledSceneGraph({
        version: 1,
        id: "src/scenes/main.scene.ts:MainScene",
        entities: [
          {
            assetId: "",
            props: undefined,
            transform: {
              position: { x: Number.NaN, y: 2, z: 3 },
            },
          },
        ],
      }),
    ).toThrow(z.ZodError);
  });
});
