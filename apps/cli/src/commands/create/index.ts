import { getOutput, withOutput } from "../../shared/output";

export const createCommand = {
  description: "Create a Destaria project",
  handler: withOutput(async () => {
    const output = await getOutput();

    return output.fail("destaria create is not implemented yet.");
  }),
};
