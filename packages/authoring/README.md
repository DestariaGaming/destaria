# @destaria/authoring

TypeScript authoring API for Destaria projects.

This package provides ergonomic helpers that produce serializable package data.
It depends on `@destaria/package-format` for the underlying data contract and
validation.

## Asset API

```ts
import { defineAsset, Mesh } from "@destaria/authoring";

type CrateProps = {
  size: "small" | "large";
  isExplosive: boolean;
};

const Crate = defineAsset<CrateProps>({
  defaultProps: {
    size: "small",
    isExplosive: false,
  },
  mesh(props) {
    return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
  },
});
```

`defineAsset()` returns a typed asset definition for the CLI to discover and
compile. Props are JSON-safe runtime data. For assets without props,
`defineAsset({ mesh })` defaults props to `{}`.

## Entity API

```ts
import { appendDefault, defineAsset, entity, Mesh } from "@destaria/authoring";

type CrateProps = {
  size: "small" | "large";
  isExplosive: boolean;
  tags: string[];
};

const Crate = defineAsset<CrateProps>({
  defaultProps: {
    size: "small",
    isExplosive: false,
    tags: ["crate"],
  },
  mesh(props) {
    return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
  },
});

const cratePlacement = entity(Crate)
  .with({
    size: "large",
    isExplosive: true,
    tags: appendDefault(["explosive"]),
  })
  .at(0, 0, 0)
  .toDescriptor();
```

`entity(asset)` creates an authoring-side placement builder. Its descriptor
preserves the asset definition token, effective JSON-safe props, and position
transform for later CLI scene compilation. It does not resolve asset IDs,
serialize package data, or create runtime entity objects.

## Mesh API

```ts
import { Mesh } from "@destaria/authoring";

const defaultCube = Mesh.cube();
const largerCube = Mesh.cube({ size: 2 });
```

`Mesh.cube()` returns a primitive mesh descriptor that can be compiled by the
CLI into asset metadata. It does not create geometry, buffers, materials, or
renderer-specific objects.
