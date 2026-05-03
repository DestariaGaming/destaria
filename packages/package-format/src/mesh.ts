import { z } from "zod";

export const CubeMeshDescriptorSchema = z
  .object({
    kind: z.literal("primitive"),
    primitive: z.literal("cube"),
    size: z.number().positive().finite().optional(),
  })
  .strict();

export const PrimitiveMeshDescriptorSchema = z.discriminatedUnion("primitive", [
  CubeMeshDescriptorSchema,
]);

export const MeshDescriptorSchema = PrimitiveMeshDescriptorSchema;

export type CubeMeshDescriptor = z.infer<typeof CubeMeshDescriptorSchema>;
export type PrimitiveMeshDescriptor = z.infer<typeof PrimitiveMeshDescriptorSchema>;
export type MeshDescriptor = z.infer<typeof MeshDescriptorSchema>;

export function validateMeshDescriptor(value: unknown): MeshDescriptor {
  return MeshDescriptorSchema.parse(value);
}
