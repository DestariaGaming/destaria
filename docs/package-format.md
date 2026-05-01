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
