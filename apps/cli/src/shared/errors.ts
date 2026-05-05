export class CommandError extends Error {
  readonly exitCode: number;

  constructor(message: string, options: { exitCode?: number } = {}) {
    super(message);
    this.name = "CommandError";
    this.exitCode = options.exitCode ?? 1;
  }
}

export class BuildError extends CommandError {
  constructor(message: string, options: { exitCode?: number } = {}) {
    super(message, options);
    this.name = "BuildError";
  }
}
