import { describe, expect, it } from "bun:test";

import { defineAsset } from "./asset";
import { Mesh } from "./mesh";

describe("defineAsset", () => {
  it("defines a prop-less asset with empty default props", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    expect(Rock.defaultProps).toEqual({});
    expect(Rock.mesh(Rock.defaultProps)).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
  });

  it("defines a prop-based asset", () => {
    type CrateProps = {
      size: "small" | "large";
      isExplosive: boolean;
    };

    const Crate = defineAsset<CrateProps>({
      defaultProps: {
        size: "large",
        isExplosive: false,
      },
      mesh(props) {
        return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
      },
    });

    expect(Crate.defaultProps).toEqual({
      size: "large",
      isExplosive: false,
    });
    expect(Crate.mesh(Crate.defaultProps)).toEqual({
      kind: "primitive",
      primitive: "cube",
      size: 4,
    });
  });

  it("rejects non-json default props", () => {
    expect(() =>
      defineAsset({
        defaultProps: {
          bad: Number.NaN,
        },
        mesh() {
          return Mesh.cube();
        },
      }),
    ).toThrow("defaultProps.bad must be JSON-safe.");
  });

  it("type-checks prop requirements", () => {
    const expectTypeErrors = () => {
      type CrateProps = {
        size: "small" | "large";
      };

      // @ts-expect-error prop-based assets must define defaultProps.
      defineAsset<CrateProps>({
        mesh() {
          return Mesh.cube();
        },
      });

      type InvalidProps = {
        callback: () => void;
      };

      // @ts-expect-error asset props must be JSON-safe object data.
      defineAsset<InvalidProps>({
        defaultProps: {
          callback() {},
        },
        mesh() {
          return Mesh.cube();
        },
      });
    };

    expect(typeof expectTypeErrors).toBe("function");
  });
});
