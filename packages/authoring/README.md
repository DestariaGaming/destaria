# @destaria/authoring

TypeScript authoring API for Destaria projects.

This package provides ergonomic source-side definitions and builders consumed
by the Destaria CLI. Mesh helpers produce serializable package data directly;
asset, entity, and scene helpers preserve authoring intent for later CLI
compilation. The package depends on `@destaria/package-format` for underlying
data contracts and JSON-safe value validation.

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

Asset definitions must be named exports from discovered `*.asset.ts` modules so
the CLI can generate stable source-derived IDs.

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

`.with(...)` recursively merges object props, replaces array props by default,
and supports `appendDefault(...)` when an array override should append to the
asset default. `.at(...)` currently sets only the position transform.

## Scene API

```ts
import { defineAsset, defineScene, entity, Mesh } from "@destaria/authoring";

const Crate = defineAsset({
  mesh() {
    return Mesh.cube();
  },
});

export const MainScene = defineScene({
  entities: [entity(Crate).at(0, 0, 0)],
});
```

`defineScene()` creates an authoring-side scene container. Scene definitions
store entity builders and snapshot them with `toDescriptor()` for later CLI
scene compilation. They do not resolve asset IDs, call asset
`mesh(props)`, serialize package data, or create runtime scene objects.

The configured entry scene module must contain exactly one named
`defineScene(...)` export. The CLI currently compiles that entry scene and only
the asset variants referenced by its entities.

## Mesh API

```ts
import { Mesh } from "@destaria/authoring";

const defaultCube = Mesh.cube();
const largerCube = Mesh.cube({ size: 2 });
```

`Mesh.cube()` returns a primitive mesh descriptor that can be compiled by the
CLI into asset metadata. It does not create geometry, buffers, materials, or
renderer-specific objects.
