import { buildProject } from "./build";
import { getOutput, withOutput } from "../../shared/output";

export const buildCommand = {
  description: "Build a Destaria project",
  handler: withOutput(async () => {
    const output = await getOutput();
    const result = await buildProject();

    return output
      .success(`Wrote ${result.outputFile}`)
      .json({ outputFile: result.outputFile, registry: result.registry });
  }),
};
