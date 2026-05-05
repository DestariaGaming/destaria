import { getOutput, withOutput } from "../../shared/output";

export const packageCommand = {
  description: "Package a Destaria game",
  handler: withOutput(async () => {
    const output = await getOutput();

    return output.fail("destaria package is not implemented yet.");
  }),
};
