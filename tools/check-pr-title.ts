export const titlePolicy = {
  types: [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
  ],
  scopes: ["cli", "docs", "repo", "sdk", "launcher", "runtime", "core"],
} as const;

type TitlePolicy = typeof titlePolicy;

export type TitleValidationResult =
  | {
      valid: true;
      type: TitlePolicy["types"][number];
      scope: TitlePolicy["scopes"][number] | undefined;
      breaking: boolean;
      subject: string;
    }
  | {
      valid: false;
      reason: string;
    };

const titlePattern = /^([a-z]+)(?:\(([a-z0-9-]+)\))?(!)?: (.+)$/;

export function validateTitle(
  title: string,
  policy: TitlePolicy = titlePolicy,
): TitleValidationResult {
  if (title.includes("\n") || title.includes("\r")) {
    return invalid("Title must be a single line.");
  }

  const match = titlePattern.exec(title);

  if (!match) {
    return invalid("Title must match `type(scope): subject` or `type: subject`.");
  }

  const type = match[1];
  const scope = match[2];
  const breaking = match[3];
  const subject = match[4];

  if (!type || !isAllowedValue(type, policy.types)) {
    return invalid("Title uses an unsupported type.");
  }

  let parsedScope: TitlePolicy["scopes"][number] | undefined;

  if (scope) {
    if (!isAllowedValue(scope, policy.scopes)) {
      return invalid("Title uses an unsupported scope.");
    }

    parsedScope = scope;
  }

  if (!subject || subject.trim().length === 0 || subject !== subject.trimStart()) {
    return invalid("Title subject must not be empty or start with extra whitespace.");
  }

  return {
    valid: true,
    type,
    scope: parsedScope,
    breaking: Boolean(breaking),
    subject,
  };
}

function isAllowedValue<const Values extends readonly string[]>(
  value: string,
  allowedValues: Values,
): value is Values[number] {
  return allowedValues.includes(value as Values[number]);
}

function invalid(reason: string): Extract<TitleValidationResult, { valid: false }> {
  return {
    valid: false,
    reason,
  };
}

function readTitleInput(): string | undefined {
  const titleFromArgs = Bun.argv.slice(2).join(" ").trim();

  if (titleFromArgs.length > 0) {
    return titleFromArgs;
  }

  return process.env.PR_TITLE;
}

function printFailure(result: Extract<TitleValidationResult, { valid: false }>): void {
  console.error("Invalid PR title.");
  console.error(result.reason);
  console.error("");
  console.error("Expected format: `type(scope): subject` or `type: subject`.");
  console.error(`Allowed types: ${titlePolicy.types.join(", ")}`);
  console.error(`Allowed scopes: ${titlePolicy.scopes.join(", ")}`);
}

if (import.meta.main) {
  const title = readTitleInput();

  if (!title) {
    printFailure(invalid("Provide a title as an argument or through PR_TITLE."));
    process.exit(1);
  }

  const result = validateTitle(title);

  if (!result.valid) {
    printFailure(result);
    process.exit(1);
  }

  console.log("PR title is valid.");
}
