export const version = "0.0.1";

export const destaria = {
  name: "destaria",
  version,
} as const;

export { defineAsset, Mesh } from "@destaria/authoring";
export type {
  AssetDefinition,
  CubeMeshOptions,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "@destaria/authoring";
