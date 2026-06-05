import { z } from "zod";

const PackageManifestSchema = z
  .object({
    version: z.literal(1),
    entrySceneId: z.string().min(1),
  })
  .strict();

/** Manifest written into a Destaria package. */
export type PackageManifest = z.infer<typeof PackageManifestSchema>;

/** Validates a manifest written into a Destaria package. */
export function validatePackageManifest(value: unknown): PackageManifest {
  return PackageManifestSchema.parse(value);
}

/** Compiler output used to assemble the initial package manifest. */
export type ManifestInput = PackageManifest;

/** Validates compiler output used to assemble the initial package manifest. */
export function validateManifestInput(value: unknown): ManifestInput {
  return validatePackageManifest(value);
}
