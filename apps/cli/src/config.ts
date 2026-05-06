const DESTARIA_CONFIG_DEFINITION = "__destariaConfigDefinition";

export type DestariaConfigOutput = {
  /** Directory where Destaria build artifacts are written, relative to the project root. */
  dir: string;
};

export type DestariaConfigSource = {
  /** Directory where Destaria source modules are discovered, relative to the project root. */
  root: string;
};

export type DestariaConfig = {
  /** Source settings for author-authored game modules. */
  source?: Partial<DestariaConfigSource>;
  /** Entry scene module path, relative to source.root. */
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
