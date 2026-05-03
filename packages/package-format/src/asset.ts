import { z } from "zod";

import { MeshDescriptorSchema } from "./mesh";

const CompiledAssetSchema = z
  .object({
    id: z.string().min(1),
    mesh: MeshDescriptorSchema,
  })
  .strict();

const AssetRegistrySchema = z
  .object({
    version: z.literal(1),
    assets: z.array(CompiledAssetSchema),
  })
  .strict();

export type CompiledAsset = z.infer<typeof CompiledAssetSchema>;
export type AssetRegistry = z.infer<typeof AssetRegistrySchema>;

export function validateCompiledAsset(value: unknown): CompiledAsset {
  return CompiledAssetSchema.parse(value);
}

export function validateAssetRegistry(value: unknown): AssetRegistry {
  return AssetRegistrySchema.parse(value);
}
