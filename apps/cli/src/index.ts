export const version = "0.0.1";

export const destaria = {
  name: "destaria",
  version,
} as const;

export { appendDefault, defineAsset, defineScene, entity, Mesh } from "@destaria/authoring";
export type { AssetDefinition, CubeMeshOptions, EntityDescriptor } from "@destaria/authoring";
export type { SceneDefinition, SceneDescriptor, SceneEntityEntry } from "@destaria/authoring";
