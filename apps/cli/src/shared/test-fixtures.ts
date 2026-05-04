import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type FixtureProjectOptions = {
  config?: false | string;
  destariaShim?: string;
  projectName?: string;
};

export async function createFixtureProject(
  files: Record<string, string>,
  options: FixtureProjectOptions | string = {},
): Promise<string> {
  const projectName = typeof options === "string" ? options : (options.projectName ?? "project-a");
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..", "..");
  const projectRoot = path.join(repositoryRoot, "tmp", projectName);
  const destariaShimRoot = path.join(projectRoot, "node_modules", "destaria");

  await rm(projectRoot, { recursive: true, force: true });
  await mkdir(destariaShimRoot, { recursive: true });
  await writeFile(
    path.join(destariaShimRoot, "package.json"),
    JSON.stringify({ name: "destaria", type: "module", exports: "./index.ts" }, null, 2),
  );
  await writeFile(
    path.join(destariaShimRoot, "index.ts"),
    `${(typeof options === "string" ? undefined : options.destariaShim) ?? createDefaultDestariaShim(repositoryRoot, destariaShimRoot)}\n`,
  );

  const config = typeof options === "string" ? undefined : options.config;
  if (config !== false) {
    await writeFile(
      path.join(projectRoot, "destaria.config.ts"),
      `${config ?? createDefaultDestariaConfig()}\n`,
    );
  }

  await Promise.all(
    Object.entries(files).map(async ([filePath, contents]) => {
      const absolutePath = path.join(projectRoot, filePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `${contents.trim()}\n`);
    }),
  );

  return projectRoot;
}

export function captureConsole(method: "error" | "log", fn: () => Promise<void>): Promise<string> {
  const originalMethod = console[method];
  const lines: string[] = [];

  console[method] = (...contents) => {
    lines.push(
      contents
        .map((content) => (typeof content === "string" ? content : JSON.stringify(content)))
        .join(" "),
    );
  };

  return fn()
    .then(() => lines.join("\n"))
    .finally(() => {
      console[method] = originalMethod;
    });
}

function createDefaultDestariaConfig(): string {
  return `import { defineConfig } from "destaria";

export default defineConfig({
  entry: "src/scenes/main.scene.ts",
  output: {
    dir: "dist",
  },
});`;
}

function createDefaultDestariaShim(repositoryRoot: string, destariaShimRoot: string): string {
  const authoringEntrypoint = path.join(repositoryRoot, "packages", "authoring", "src", "index.ts");
  const authoringImportPath = path
    .relative(destariaShimRoot, authoringEntrypoint)
    .split(path.sep)
    .join(path.posix.sep);

  return `export { appendDefault, defineAsset, defineScene, entity, Mesh } from "${authoringImportPath}";

export function defineConfig(config) {
  return {
    ...config,
    __destariaConfigDefinition: true,
  };
}`;
}
