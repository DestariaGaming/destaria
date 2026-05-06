import { getOutput, withOutput } from "../../shared/output";

export const devCommand = {
  description: "Run Destaria development mode",
  handler: withOutput(async () => {
    const output = await getOutput();

    return output.fail("destaria dev is not implemented yet.");
  }),
};
