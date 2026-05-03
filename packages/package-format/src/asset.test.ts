import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { validateAssetRegistry, validateCompiledAsset } from "./asset";

describe("asset package format", () => {
  it("accepts compiled primitive asset metadata", () => {
    expect(
      validateCompiledAsset({
        id: "src/assets/crate.asset.ts:Crate",
        mesh: {
          kind: "primitive",
          primitive: "cube",
        },
      }),
    ).toEqual({
      id: "src/assets/crate.asset.ts:Crate",
      mesh: {
        kind: "primitive",
        primitive: "cube",
      },
    });
  });

  it("accepts an asset registry", () => {
    expect(
      validateAssetRegistry({
        version: 1,
        assets: [
          {
            id: "src/assets/crate.asset.ts:Crate",
            mesh: {
              kind: "primitive",
              primitive: "cube",
            },
          },
        ],
      }),
    ).toEqual({
      version: 1,
      assets: [
        {
          id: "src/assets/crate.asset.ts:Crate",
          mesh: {
            kind: "primitive",
            primitive: "cube",
          },
        },
      ],
    });
  });

  it("rejects asset registries without a supported version", () => {
    expect(() =>
      validateAssetRegistry({
        version: 2,
        assets: [],
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects compiled assets without a valid mesh", () => {
    expect(() =>
      validateCompiledAsset({
        id: "src/assets/crate.asset.ts:Crate",
        mesh: {
          kind: "primitive",
          primitive: "sphere",
        },
      }),
    ).toThrow(z.ZodError);
  });
});
