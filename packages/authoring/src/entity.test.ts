import { describe, expect, it } from "bun:test";
import type { JsonValue } from "@destaria/package-format";

import { defineAsset } from "./asset";
import { appendDefault, entity } from "./entity";
import { Mesh } from "./mesh";

describe("entity", () => {
  it("creates an origin descriptor without requiring at", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(entity(Rock).toDescriptor()).toEqual({
      assetDefinition: Rock,
      props: {},
      transform: {
        position: { x: 0, y: 0, z: 0 },
      },
    });
  });

  it("sets the position transform", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(entity(Rock).at(1, 2, 3).toDescriptor().transform.position).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it("uses default props as effective props", () => {
    type CrateProps = {
      size: "small" | "large";
      isExplosive: boolean;
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        size: "small",
        isExplosive: false,
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(entity(Crate).toDescriptor().props).toEqual({
      size: "small",
      isExplosive: false,
    });
  });

  it("deep merges object props", () => {
    type CrateProps = {
      size: "small" | "large";
      material: {
        color: string;
        roughness: number;
      };
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        size: "small",
        material: {
          color: "red",
          roughness: 0.5,
        },
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(
      entity(Crate)
        .with({
          material: {
            roughness: 0.8,
          },
        })
        .toDescriptor().props,
    ).toEqual({
      size: "small",
      material: {
        color: "red",
        roughness: 0.8,
      },
    });
  });

  it("replaces arrays by default", () => {
    type CrateProps = {
      tags: string[];
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        tags: ["crate"],
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(
      entity(Crate)
        .with({ tags: ["explosive"] })
        .toDescriptor().props.tags,
    ).toEqual(["explosive"]);
  });

  it("appends arrays with appendDefault", () => {
    type CrateProps = {
      tags: string[];
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        tags: ["crate"],
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(
      entity(Crate)
        .with({ tags: appendDefault(["explosive"]) })
        .toDescriptor().props.tags,
    ).toEqual(["crate", "explosive"]);
  });

  it("mutates the builder while preserving descriptor snapshots", () => {
    type CrateProps = {
      tags: string[];
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        tags: ["crate"],
      },
      mesh() {
        return Mesh.cube();
      },
    });
    const builder = entity(Crate);
    const firstDescriptor = builder.with({ tags: appendDefault(["heavy"]) }).toDescriptor();
    const secondDescriptor = builder
      .with({ tags: appendDefault(["explosive"]) })
      .at(4, 5, 6)
      .toDescriptor();

    expect(firstDescriptor.props.tags).toEqual(["crate", "heavy"]);
    expect(firstDescriptor.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(secondDescriptor.props.tags).toEqual(["crate", "explosive"]);
    expect(secondDescriptor.transform.position).toEqual({ x: 4, y: 5, z: 6 });
  });

  it("appends to default arrays instead of previous overrides", () => {
    type CrateProps = {
      tags: string[];
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        tags: ["crate"],
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(
      entity(Crate)
        .with({ tags: ["custom"] })
        .with({ tags: appendDefault(["explosive"]) })
        .toDescriptor().props.tags,
    ).toEqual(["crate", "explosive"]);
  });

  it("rejects invalid transform values", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(() => entity(Rock).at(Number.NaN, 0, 0)).toThrow(
      "transform.position.x must be a finite number.",
    );
    expect(() => entity(Rock).at(0, Number.POSITIVE_INFINITY, 0)).toThrow(
      "transform.position.y must be a finite number.",
    );
  });

  it("rejects undefined prop overrides", () => {
    type CrateProps = {
      size: "small" | "large";
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        size: "small",
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(() =>
      entity(Crate).with({
        size: undefined as unknown as "large",
      }),
    ).toThrow("propsOverride.size must not be undefined.");
  });

  it("rejects non-json effective props", () => {
    type CrateProps = {
      meta: JsonValue;
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        meta: null,
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(() => entity(Crate).with({ meta: new Date() as unknown as JsonValue })).toThrow(
      "propsOverride.meta must be JSON-safe.",
    );
  });

  it("rejects appendDefault on non-array props", () => {
    type CrateProps = {
      size: string;
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        size: "small",
      },
      mesh() {
        return Mesh.cube();
      },
    });

    expect(() =>
      entity(Crate).with({
        size: appendDefault(["large"]) as unknown as string,
      }),
    ).toThrow("propsOverride.size can only append to an array prop.");
  });

  it("type-checks prop override requirements", () => {
    const expectTypeErrors = () => {
      type CrateProps = {
        size: "small" | "large";
        material: {
          color: string;
          roughness: number;
        };
        tags: string[];
      };

      const Crate = defineAsset<CrateProps>({
        defaultProps: {
          size: "small",
          material: {
            color: "red",
            roughness: 0.5,
          },
          tags: ["crate"],
        },
        mesh() {
          return Mesh.cube();
        },
      });

      entity(Crate).with({
        size: "large",
        material: {
          color: "blue",
        },
        tags: appendDefault(["explosive"]),
      });

      const Rock = defineAsset({
        mesh() {
          return Mesh.cube();
        },
      });

      // @ts-expect-error prop-less assets do not accept meaningful prop keys.
      entity(Rock).with({ size: "large" });

      // @ts-expect-error prop overrides must match asset props.
      entity(Crate).with({ size: "medium" });

      // @ts-expect-error appendDefault values must match array item props.
      entity(Crate).with({ tags: appendDefault([1]) });
    };

    expect(typeof expectTypeErrors).toBe("function");
  });
});
