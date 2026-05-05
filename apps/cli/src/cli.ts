import { cli } from "cli-forge";

import { buildCommand } from "./commands/build";
import { createCommand } from "./commands/create";
import { devCommand } from "./commands/dev";
import { listCommand } from "./commands/list";
import { packageCommand } from "./commands/package";
import { loadProjectContext } from "./project/context";
import { loadSourceRegistry } from "./project/source-registry";
import { createOutput } from "./shared/output";

export function createDestariaCli() {
  return cli("destaria", {
    description: "Destaria developer CLI",
  })
    .option("project", {
      type: "string",
      description: "Project root",
      default: ".",
    })
    .option("output", {
      type: "string",
      description: "Asset registry output path, relative to the project root",
    })
    .option("json", {
      type: "boolean",
      description: "Print command output as JSON",
      default: false,
    })
    .provide("projectContext", {
      factory: (args) =>
        loadProjectContext({
          projectRoot: args.project,
          outputFile: args.output,
        }),
    })
    .provide("sourceRegistry", {
      factory: () => loadSourceRegistry(),
    })
    .provide("output", {
      factory: () => createOutput(),
    })
    .command("create", { ...createCommand })
    .command("dev", { ...devCommand })
    .command("build", { ...buildCommand })
    .command("list", { ...listCommand })
    .command("package", { ...packageCommand });
}

export const destariaCli = createDestariaCli();
