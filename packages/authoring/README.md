# @destaria/authoring

TypeScript authoring API for Destaria projects.

This package provides ergonomic helpers that produce serializable package data.
It depends on `@destaria/package-format` for the underlying data contract and
validation.

## Mesh API

```ts
import { Mesh } from "@destaria/authoring";

const defaultCube = Mesh.cube();
const largerCube = Mesh.cube({ size: 2 });
```

`Mesh.cube()` returns a primitive mesh descriptor that can be compiled by the
CLI into asset metadata. It does not create geometry, buffers, materials, or
renderer-specific objects.
