import { z } from "zod";

const ManifestInputSchema = z
  .object({
    version: z.literal(1),
    entrySceneId: z.string().min(1),
  })
  .strict();

export type ManifestInput = z.infer<typeof ManifestInputSchema>;

export function validateManifestInput(value: unknown): ManifestInput {
  return ManifestInputSchema.parse(value);
}
