const DESTARIA_CONFIG_DEFINITION = "__destariaConfigDefinition";

export type DestariaConfigOutput = {
  /** Directory where Destaria build artifacts are written, relative to the project root. */
  dir: string;
};

export type DestariaConfig = {
  /** Entry scene module path, relative to the project root. */
  entry: string;
  /** Build output settings for generated package artifacts. */
  output: DestariaConfigOutput;
};

export type DestariaConfigDefinition = DestariaConfig & {
  readonly [DESTARIA_CONFIG_DEFINITION]: true;
};

/** Defines the typed Destaria project configuration exported from destaria.config.ts. */
export function defineConfig(config: DestariaConfig): DestariaConfigDefinition {
  return {
    ...config,
    [DESTARIA_CONFIG_DEFINITION]: true,
  };
}

export function isDestariaConfigDefinition(value: unknown): value is DestariaConfigDefinition {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)[DESTARIA_CONFIG_DEFINITION] === true
  );
}
