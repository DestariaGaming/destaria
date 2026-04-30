import { describe, expect, it } from "bun:test";

import { titlePolicy, validateTitle } from "./check-pr-title";

describe("validateTitle", () => {
  it("accepts scoped titles", () => {
    expect(validateTitle("feat(cli): add command")).toEqual({
      valid: true,
      type: "feat",
      scope: "cli",
      breaking: false,
      subject: "add command",
    });
  });

  it("accepts unscoped titles", () => {
    expect(validateTitle("chore: update repository metadata")).toEqual({
      valid: true,
      type: "chore",
      scope: undefined,
      breaking: false,
      subject: "update repository metadata",
    });
  });

  it("accepts every configured scope", () => {
    for (const scope of titlePolicy.scopes) {
      expect(validateTitle(`fix(${scope}): handle edge case`)).toMatchObject({
        valid: true,
        type: "fix",
        scope,
      });
    }
  });

  it("accepts breaking-change markers", () => {
    expect(validateTitle("feat(core)!: change package format")).toMatchObject({
      valid: true,
      type: "feat",
      scope: "core",
      breaking: true,
      subject: "change package format",
    });

    expect(validateTitle("feat!: change package format")).toMatchObject({
      valid: true,
      type: "feat",
      scope: undefined,
      breaking: true,
      subject: "change package format",
    });
  });

  it("rejects unknown types", () => {
    expect(validateTitle("unknown(cli): add command")).toMatchObject({
      valid: false,
    });
  });

  it("rejects unknown scopes", () => {
    expect(validateTitle("feat(web): add command")).toMatchObject({
      valid: false,
    });
  });

  it("rejects missing subjects", () => {
    expect(validateTitle("feat(cli): ")).toMatchObject({
      valid: false,
    });
  });

  it("rejects malformed separators", () => {
    expect(validateTitle("feat(cli) add command")).toMatchObject({
      valid: false,
    });

    expect(validateTitle("feat : add command")).toMatchObject({
      valid: false,
    });
  });

  it("rejects multi-line titles", () => {
    expect(validateTitle("feat(cli): add command\nmalicious")).toMatchObject({
      valid: false,
    });
  });
});
