import type { CubeMeshDescriptor } from "@destaria/package-format";
import { validateMeshDescriptor } from "@destaria/package-format";

export type CubeMeshOptions = {
  size?: number;
};

export const Mesh = {
  cube(options: CubeMeshOptions = {}): CubeMeshDescriptor {
    const descriptor =
      options.size === undefined
        ? { kind: "primitive", primitive: "cube" }
        : { kind: "primitive", primitive: "cube", size: options.size };

    return validateMeshDescriptor(descriptor);
  },
} as const;
