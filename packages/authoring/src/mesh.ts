import type { CubeMeshDescriptor } from "@destaria/package-format";
import { validateMeshDescriptor } from "@destaria/package-format";

/**
 * Options for `Mesh.cube()`.
 */
export type CubeMeshOptions = {
  /**
   * Uniform cube edge length.
   *
   * Must be a positive finite number when provided.
   */
  size?: number;
};

/**
 * Mesh descriptor helpers for authored assets.
 *
 * These helpers return serializable package-format descriptors. They do not
 * create runtime geometry, buffers, materials, or renderer-specific objects.
 */
export const Mesh = {
  /**
   * Creates a primitive cube mesh descriptor.
   *
   * @throws Zod validation error when options produce an invalid descriptor.
   */
  cube(options: CubeMeshOptions = {}): CubeMeshDescriptor {
    const descriptor =
      options.size === undefined
        ? { kind: "primitive", primitive: "cube" }
        : { kind: "primitive", primitive: "cube", size: options.size };

    return validateMeshDescriptor(descriptor);
  },
} as const;
