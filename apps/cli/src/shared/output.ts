import { getCommandContext } from "cli-forge/context";

import { CommandError } from "./errors";

type OutputStatus = "success" | "fail";
type OutputMessageKind = "debug" | "info" | "success" | "error";

type OutputMessage = {
  kind: OutputMessageKind;
  message: string;
};

type SerializedError = {
  name: string;
  message: string;
};

export type OutputResult = {
  readonly status: OutputStatus;
  readonly messages: readonly OutputMessage[];
  readonly data?: unknown;
  readonly error?: unknown;
  getExitCode(): number;
  exitCode(code: number): OutputResult;
  json(data: unknown): OutputResult;
};

type MutableOutputResult = {
  status: OutputStatus;
  messages: OutputMessage[];
  data?: unknown;
  error?: unknown;
  exitCode: number;
};

export type Output = {
  debug(message: string): OutputResult;
  info(message: string): OutputResult;
  success(message: string): OutputResult;
  fail(message: string, error?: unknown): OutputResult;
};

type OutputProvider = {
  inject(key: "output"): Promise<Output>;
};

type JsonArgs = {
  json?: boolean;
};

export function createOutput(): Output {
  return {
    debug(message) {
      return createResult("success", "debug", message);
    },
    info(message) {
      return createResult("success", "info", message);
    },
    success(message) {
      return createResult("success", "success", message);
    },
    fail(message, error) {
      return createResult("fail", "error", message, error);
    },
  };
}

export async function getOutput(): Promise<Output> {
  return await (getCommandContext() as OutputProvider).inject("output");
}

export function renderOutput(result: OutputResult, json: boolean): void {
  process.exitCode = result.getExitCode();

  if (json) {
    console.log(JSON.stringify(toJsonOutput(result), null, 2));
    return;
  }

  const messages = result.messages.filter((message) => message.kind !== "debug");
  const write = result.status === "fail" ? console.error : console.log;

  for (const { message } of messages) {
    write(message);
  }
}

export function withOutput<TArgs extends JsonArgs>(
  handler: (args: TArgs) => Promise<OutputResult> | OutputResult,
): (args: TArgs) => Promise<void> {
  return async (args) => {
    try {
      renderOutput(await handler(args), args.json === true);
    } catch (error) {
      if (error instanceof CommandError) {
        const output = await getOutput();

        renderOutput(
          output.fail(error.message, error).exitCode(error.exitCode),
          args.json === true,
        );
        return;
      }

      throw error;
    }
  };
}

function createResult(
  status: OutputStatus,
  kind: OutputMessageKind,
  message: string,
  error?: unknown,
): OutputResult {
  const state: MutableOutputResult = {
    status,
    messages: [{ kind, message }],
    error,
    exitCode: status === "success" ? 0 : 1,
  };

  return {
    get status() {
      return state.status;
    },
    get messages() {
      return state.messages;
    },
    get data() {
      return state.data;
    },
    get error() {
      return state.error;
    },
    getExitCode() {
      return state.exitCode;
    },
    exitCode(code) {
      state.exitCode = code;
      return this;
    },
    json(data) {
      state.data = data;
      return this;
    },
  };
}

function toJsonOutput(result: OutputResult): unknown {
  if (result.status === "fail") {
    const failureOutput: Record<string, unknown> = {
      ok: false,
      errors: result.error === undefined ? messageErrors(result) : [serializeError(result.error)],
    };

    if (result.data !== undefined) {
      failureOutput.data = result.data;
    }

    return failureOutput;
  }

  return {
    ok: true,
    messages: result.messages.map(({ message }) => message),
    data: result.data ?? null,
  };
}

function messageErrors(result: OutputResult): SerializedError[] {
  return result.messages
    .filter((message) => message.kind === "error")
    .map(({ message }) => ({ name: "Error", message }));
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}
