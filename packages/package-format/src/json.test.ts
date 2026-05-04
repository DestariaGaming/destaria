import { describe, expect, it } from "bun:test";

import { cloneJsonValue, isJsonValue, isPlainJsonObject, validateJsonValue } from "./json";

describe("json package format", () => {
  it("accepts json-safe values", () => {
    const value = {
      name: "crate",
      size: 2,
      visible: true,
      metadata: null,
      tags: ["asset", "mesh"],
      nested: {
        enabled: false,
      },
    };

    expect(isJsonValue(value)).toBe(true);
    expect(() => validateJsonValue(value)).not.toThrow();
  });

  it("rejects undefined values", () => {
    expect(() => validateJsonValue({ bad: undefined }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
  });

  it("rejects non-finite numbers", () => {
    expect(() => validateJsonValue({ bad: Number.NaN }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
    expect(() => validateJsonValue({ bad: Number.POSITIVE_INFINITY }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
  });

  it("rejects non-json object values", () => {
    class NotJson {
      readonly value = 1;
    }

    expect(() => validateJsonValue({ bad: new Date() }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
    expect(() => validateJsonValue({ bad: new NotJson() }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
  });

  it("rejects functions and symbols", () => {
    expect(() => validateJsonValue({ bad() {} }, "props")).toThrow("props.bad must be JSON-safe.");
    expect(() => validateJsonValue({ bad: Symbol("bad") }, "props")).toThrow(
      "props.bad must be JSON-safe.",
    );
  });

  it("clones json-safe values", () => {
    const value = {
      tags: ["crate"],
      nested: {
        enabled: true,
      },
    };
    const clone = cloneJsonValue(value);

    expect(clone).toEqual(value);
    expect(clone).not.toBe(value);
    expect(clone.tags).not.toBe(value.tags);
    expect(clone.nested).not.toBe(value.nested);
  });

  it("detects plain json objects", () => {
    class NotPlain {
      readonly value = 1;
    }

    expect(isPlainJsonObject({})).toBe(true);
    expect(isPlainJsonObject(Object.create(null))).toBe(true);
    expect(isPlainJsonObject([])).toBe(false);
    expect(isPlainJsonObject(new NotPlain())).toBe(false);
  });
});
