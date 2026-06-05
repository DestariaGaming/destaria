# Package Format

Destaria games are distributed as:

```txt
.destariapkg
```

This package is the strict contract between CLI, Runtime, and Launcher.

## Initial Container

```txt
game.destariapkg
  manifest.json
  scene.json
  asset-registry.json
```

The initial `.destariapkg` format is a single uncompressed tar archive. The CLI
uses Bun's native archive support to write it. Compression, script bundles, and
binary asset packing are future additions.

The package-format module exports `validatePackageContents(value)` to validate
the three structured files and their cross-file references. It verifies that
the manifest references the packaged scene, asset IDs are unique, and scene
entities reference packaged assets.

## Design Rules

- JSON stores metadata, graphs, references, and small structured values.
- Binary files store heavy data such as meshes, textures, and audio.
- JavaScript bundles store runtime scripts compiled from TypeScript.
- Package references should be explicit and resolvable.
- Runtime loading should validate package data before execution where practical.
- Zod schemas inside `@destaria/package-format` keep TypeScript package
  contract types and runtime validation in sync.

## JSON Values

Small structured package metadata uses JSON-safe values. The
`@destaria/package-format` module exports `JsonValue` types and
`validateJsonValue(value)` helpers backed by Zod's JSON schema support.

JSON-safe package values exclude data that cannot be preserved in package
metadata, including `undefined`, `NaN`, `Infinity`, functions, symbols, `Date`,
and class instances.

## Mesh Descriptors

Primitive meshes are stored as serializable metadata. The first supported
descriptor is a cube:

```json
{
  "kind": "primitive",
  "primitive": "cube"
}
```

An optional positive finite `size` value represents a uniform cube edge length:

```json
{
  "kind": "primitive",
  "primitive": "cube",
  "size": 2
}
```

The descriptor does not contain vertex buffers, renderer objects, materials, or
WebGPU/WebGL/canvas details. Runtime code is responsible for turning package
data into renderable geometry later.

The package-format module exports `validateMeshDescriptor(value)`, which parses
unknown data and returns a typed descriptor or throws a Zod validation error.

## Asset Registry

The first build artifact for authored assets is:

```txt
dist/asset-registry.json
```

It contains compiled, serializable asset metadata:

```json
{
  "version": 1,
  "assets": [
    {
      "id": "src/assets/crate.asset.ts:Crate#variant-1",
      "mesh": {
        "kind": "primitive",
        "primitive": "cube"
      }
    }
  ]
}
```

Source asset IDs are generated deterministically from the source path and named
asset export. Moving asset files or renaming asset exports changes those IDs.
The registry stores package-format data only; it does not reference TypeScript
source at runtime.

For prop-based authored assets, `mesh(props)` may produce different package data
for different entity placements. The compiler emits only variants referenced by
the entry scene and reuses variants with identical effective props. Current
variant IDs append a build-local suffix such as `#variant-1` to the source asset
ID. Treat the full emitted ID as opaque because the suffix strategy may change.

## Scene Graph

The CLI compiles the configured entry scene into a validated scene graph:

```json
{
  "version": 1,
  "id": "src/scenes/main.scene.ts:MainScene",
  "entities": [
    {
      "assetId": "src/assets/crate.asset.ts:Crate#variant-1",
      "props": {
        "size": "large"
      },
      "transform": {
        "position": {
          "x": 1,
          "y": 2,
          "z": 3
        }
      }
    }
  ]
}
```

Scene IDs are generated from the source path and named scene export. Entity
asset references point to compiled asset variants, while `props` preserves the
effective JSON-safe entity configuration used to compile that variant.

The package-format module exports `validateCompiledSceneEntity(value)` and
`validateCompiledSceneGraph(value)`.

## Package Manifest

The initial package manifest identifies the entry scene:

```json
{
  "version": 1,
  "entrySceneId": "src/scenes/main.scene.ts:MainScene"
}
```

The package-format module exports `validatePackageManifest(value)`. The compiler
also exposes the same initial shape as `ManifestInput` before package assembly.
Runtime compatibility fields will be added as the format evolves.

## Build And Package Output

`destaria build` writes the loose build artifact:

```txt
dist/
  asset-registry.json
```

The build also produces the compiled entry scene graph and manifest input as
validated in-memory data and exposes them in JSON command output.

`destaria package` compiles the project and writes:

```txt
dist/
  game.destariapkg
```

The package contains `manifest.json`, `scene.json`, and `asset-registry.json`.
It contains package-format data only and does not include TypeScript source.

## Component Contract

The CLI writes `.destariapkg` files.

The runtime reads `.destariapkg` files and executes their contents.

The launcher installs, locates, and launches `.destariapkg` files with a
compatible runtime.

No component should rely on private knowledge from another component when the
package format should express that information directly.

## Open Decisions

These details still need to be specified:

- final manifest schema and runtime compatibility fields
- packaged scene layout and support for scenes beyond the entry scene
- stability requirements for generated scene and asset variant IDs
- script API surface and permissions
- runtime version compatibility rules
- asset hashing and deduplication strategy
- save data location and package identity rules
