# @destaria/package-format

Shared TypeScript definitions and validation for data written into
`.destariapkg` packages.

This package owns the structured contract between the CLI and future runtime.
It does not expose authoring helpers or rendering behavior.

Zod schemas are used internally as the source of truth for package-format
contracts. Types are inferred from those schemas so runtime validation and
TypeScript definitions stay in sync.

## JSON Values

Small structured package data uses JSON-safe values:

```ts
import { validateJsonValue } from "@destaria/package-format";

const props = {
  size: "large",
  tags: ["crate", "explosive"],
};

validateJsonValue(props);
```

The JSON value contract is backed by Zod's JSON schema support and rejects data
that cannot be preserved in package metadata, including `undefined`, `NaN`,
`Infinity`, functions, symbols, `Date`, and class instances.

## Mesh Descriptors

Primitive cube meshes are represented as serializable package data:

```ts
import { validateMeshDescriptor } from "@destaria/package-format";

const mesh = validateMeshDescriptor({
  kind: "primitive",
  primitive: "cube",
  size: 2,
});
```

Omitting `size` represents the default cube. Runtime code should read this
package data and decide how to generate or load renderable geometry.

## Asset Registry

Compiled assets are emitted as referenced variants in a versioned registry:

```ts
import { validateAssetRegistry } from "@destaria/package-format";

const registry = validateAssetRegistry({
  version: 1,
  assets: [
    {
      id: "src/assets/crate.asset.ts:Crate#variant-1",
      mesh: { kind: "primitive", primitive: "cube" },
    },
  ],
});
```

## Scene Graph

Compiled scene entities reference emitted asset variant IDs and preserve their
effective JSON-safe props and position transform:

```ts
import { validateCompiledSceneGraph } from "@destaria/package-format";

const scene = validateCompiledSceneGraph({
  version: 1,
  id: "src/scenes/main.scene.ts:MainScene",
  entities: [
    {
      assetId: "src/assets/crate.asset.ts:Crate#variant-1",
      props: {},
      transform: { position: { x: 0, y: 0, z: 0 } },
    },
  ],
});
```

## Package Manifest

The initial package manifest identifies the package entry scene:

```ts
import { validatePackageManifest } from "@destaria/package-format";

const manifest = validatePackageManifest({
  version: 1,
  entrySceneId: "src/scenes/main.scene.ts:MainScene",
});
```

## Complete Package

The initial `.destariapkg` container is an uncompressed archive containing
`manifest.json`, `scene.json`, and `asset-registry.json`.

`validatePackageContents(value)` validates each file and checks the references
between them:

```ts
import { validatePackageContents } from "@destaria/package-format";

const contents = validatePackageContents({
  manifest,
  scene,
  assetRegistry,
});
```
