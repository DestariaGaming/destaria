import { cli } from "cli-forge";

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
      handler: () => {
        console.log("destaria build is not implemented yet.");
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
