# Package Format

Destaria games are distributed as:

```txt
.destariapkg
```

This package is the strict contract between CLI, Runtime, and Launcher.

## Baseline Structure

```txt
manifest.json
scene.json
asset-registry.json
game.bundle.js

assets/
meshes/
textures/
audio/
```

The exact schema will evolve, but the boundary should remain stable: packaged
games are structured data plus script bundles and binary assets.

## Design Rules

- JSON stores metadata, graphs, references, and small structured values.
- Binary files store heavy data such as meshes, textures, and audio.
- JavaScript bundles store runtime scripts compiled from TypeScript.
- Package references should be explicit and resolvable.
- Runtime loading should validate package data before execution where practical.
- Zod schemas inside `@destaria/package-format` keep TypeScript package
  contract types and runtime validation in sync.

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
      "id": "src/assets/crate.asset.ts:Crate",
      "mesh": {
        "kind": "primitive",
        "primitive": "cube"
      }
    }
  ]
}
```

Asset IDs are generated deterministically from the source path and named asset
export. Treat them as opaque runtime references once emitted; moving asset files
or renaming asset exports changes generated IDs. The registry stores
package-format data only; it does not reference TypeScript source at runtime.

For prop-based authored assets, `mesh(props)` may produce different package data
for different entity placements. The current default-props asset registry output
is an early build proof; the compiler should eventually emit package-ready
asset metadata for referenced scene/entity variants rather than every discovered
source asset definition or every possible prop branch.

## Component Contract

The CLI writes `.destariapkg` files.

The runtime reads `.destariapkg` files and executes their contents.

The launcher installs, locates, and launches `.destariapkg` files with a
compatible runtime.

No component should rely on private knowledge from another component when the
package format should express that information directly.

## Open Decisions

These details still need to be specified:

- whether `.destariapkg` is a directory, archive, or both during development
- manifest schema
- scene graph schema
- asset registry schema
- script API surface and permissions
- runtime version compatibility rules
- asset hashing and deduplication strategy
- save data location and package identity rules
