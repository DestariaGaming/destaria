import { packageProject } from "./package";
import { getOutput, withOutput } from "../../shared/output";

export const packageCommand = {
  description: "Package a Destaria game",
  handler: withOutput(async () => {
    const output = await getOutput();
    const result = await packageProject();

    return output.success(`Wrote ${result.outputFile}`).json({
      outputFile: result.outputFile,
      manifest: result.contents.manifest,
    });
  }),
};
