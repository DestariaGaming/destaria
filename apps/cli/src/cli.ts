import { cli } from "cli-forge";

import { buildProject, BuildError } from "./build";

export function createDestariaCli() {
  return cli("destaria", {
    description: "Destaria developer CLI",
  })
    .command("create", {
      description: "Create a Destaria project",
      handler: () => {
        console.log("destaria create is not implemented yet.");
      },
    })
    .command("dev", {
      description: "Run Destaria development mode",
      handler: () => {
        console.log("destaria dev is not implemented yet.");
      },
    })
    .command("build", {
      description: "Build a Destaria project",
      builder: (args) =>
        args
          .option("project", {
            type: "string",
            description: "Project root to build",
            default: ".",
          })
          .option("output", {
            type: "string",
            description: "Asset registry output path, relative to the project root",
            default: "dist/asset-registry.json",
          }),
      handler: async (args) => {
        try {
          const result = await buildProject({
            projectRoot: args.project,
            outputFile: args.output,
          });

          console.log(`Wrote ${result.outputFile}`);
        } catch (error) {
          if (error instanceof BuildError) {
            console.error(error.message);
            process.exitCode = 1;
            return;
          }

          throw error;
        }
      },
    })
    .command("package", {
      description: "Package a Destaria game",
      handler: () => {
        console.log("destaria package is not implemented yet.");
      },
    });
}

export const destariaCli = createDestariaCli();
