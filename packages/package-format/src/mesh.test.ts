import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { validateMeshDescriptor } from "./mesh";

describe("validateMeshDescriptor", () => {
  it("accepts a default primitive cube descriptor", () => {
    expect(validateMeshDescriptor({ kind: "primitive", primitive: "cube" })).toEqual({
      kind: "primitive",
      primitive: "cube",
    });
  });

  it("accepts a primitive cube descriptor with size", () => {
    expect(validateMeshDescriptor({ kind: "primitive", primitive: "cube", size: 2 })).toEqual({
      kind: "primitive",
      primitive: "cube",
      size: 2,
    });
  });

  it("rejects non-object descriptors", () => {
    for (const value of [undefined, null, "cube", 1, true, []]) {
      expect(() => validateMeshDescriptor(value)).toThrow(z.ZodError);
    }
  });

  it("rejects unsupported descriptor kinds", () => {
    expect(() => validateMeshDescriptor({ kind: "complex", primitive: "cube" })).toThrow(
      z.ZodError,
    );
  });

  it("rejects unsupported primitive descriptors", () => {
    expect(() => validateMeshDescriptor({ kind: "primitive", primitive: "sphere" })).toThrow(
      z.ZodError,
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "2"])(
    "rejects invalid cube sizes",
    (size) => {
      expect(() => validateMeshDescriptor({ kind: "primitive", primitive: "cube", size })).toThrow(
        z.ZodError,
      );
    },
  );

  it("rejects unknown cube descriptor fields", () => {
    expect(() =>
      validateMeshDescriptor({ kind: "primitive", primitive: "cube", color: "red" }),
    ).toThrow(z.ZodError);
  });
});
