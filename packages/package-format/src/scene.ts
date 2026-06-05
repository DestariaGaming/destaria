import { z } from "zod";

import { isPlainJsonObject, JsonValueSchema } from "./json";

const JsonObjectSchema = JsonValueSchema.refine(isPlainJsonObject);

const EntityPositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })
  .strict();

const EntityTransformSchema = z
  .object({
    position: EntityPositionSchema,
  })
  .strict();

const CompiledSceneEntitySchema = z
  .object({
    assetId: z.string().min(1),
    props: JsonObjectSchema,
    transform: EntityTransformSchema,
  })
  .strict();

const CompiledSceneGraphSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1),
    entities: z.array(CompiledSceneEntitySchema),
  })
  .strict();

export type CompiledSceneEntity = z.infer<typeof CompiledSceneEntitySchema>;
export type CompiledSceneGraph = z.infer<typeof CompiledSceneGraphSchema>;

export function validateCompiledSceneEntity(value: unknown): CompiledSceneEntity {
  return CompiledSceneEntitySchema.parse(value);
}

export function validateCompiledSceneGraph(value: unknown): CompiledSceneGraph {
  return CompiledSceneGraphSchema.parse(value);
}
