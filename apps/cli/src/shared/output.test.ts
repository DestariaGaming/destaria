import { afterEach, describe, expect, it } from "bun:test";

import { createDestariaCli } from "../cli";
import { CommandError } from "./errors";
import { createOutput, renderOutput, withOutput } from "./output";
import { captureConsole } from "./test/fixtures";

describe("cli output", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("renders success text and sets exit code 0", async () => {
    const output = await captureConsole("log", async () => {
      renderOutput(createOutput().success("done"), false);
    });

    expect(output).toBe("done");
    expect(process.exitCode).toBe(0);
  });

  it("renders failure text and sets a custom exit code", async () => {
    const output = await captureConsole("error", async () => {
      renderOutput(createOutput().fail("bad").exitCode(2), false);
    });

    expect(output).toBe("bad");
    expect(process.exitCode).toBe(2);
  });

  it("renders json output", async () => {
    const output = await captureConsole("log", async () => {
      renderOutput(createOutput().success("done").json({ value: 1 }), true);
    });

    expect(JSON.parse(output)).toEqual({
      ok: true,
      messages: ["done"],
      data: {
        value: 1,
      },
    });
  });

  it("renders command errors from wrapped handlers", async () => {
    const cli = createDestariaCli().command("expected-failure", {
      handler: withOutput(() => {
        throw new CommandError("expected failure", { exitCode: 3 });
      }),
    });

    const output = await captureConsole("error", async () => {
      await cli.forge(["expected-failure"]);
    });

    expect(output).toBe("expected failure");
    expect(process.exitCode).toBe(3);
  });

  it("rethrows unexpected errors from wrapped handlers", async () => {
    const error = new Error("boom");

    await expect(
      withOutput(() => {
        throw error;
      })({}),
    ).rejects.toBe(error);
  });
});
