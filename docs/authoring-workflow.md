# Authoring Workflow

Destaria authoring is TypeScript-first. Source projects describe assets, scenes,
entities, and scripts. The CLI turns those descriptions into package data.

## Authoring Model

Developers define:

- assets: reusable things in the world
- scenes: where things exist
- entities: instances placed in scenes
- scripts: runtime behavior

## Assets

Assets are reusable definitions of game objects and resources.

Examples:

- meshes
- materials
- animations
- optional scripts

Meshes may be primitive, procedural, imported, or composed.

The first mesh authoring helper is `Mesh.cube()`, which produces serializable
package data:

```ts
import { Asset, Mesh } from "destaria";

export class Crate extends Asset {
  static mesh = Mesh.cube({ size: 2 });
}
```

This creates a descriptor for the CLI to include in compiled asset metadata. It
does not create runtime geometry or renderer-specific objects.

## Scenes

Scenes describe world contents.

Examples:

- entities
- lights
- cameras
- layout

Scenes should compile into structured data that the runtime can load without
inspecting the original TypeScript source.

## Entities

An entity is an instance of an asset placed in a scene.

Entities can have:

- transform
- scene-local configuration
- attached scripts
- references to assets or other entities

## Scripts

Scripts define runtime behavior.

Rules:

- authored in TypeScript
- bundled to JavaScript by the CLI
- executed by the runtime
- interact through controlled engine APIs

Scripts should not rely on private runtime internals.

## Development Mode

```txt
TypeScript source
  -> CLI dev mode
  -> Runtime live reload
```

Expected loop:

```txt
edit -> save -> rebuild changed data -> reload runtime state
```

## Packaging

```txt
TypeScript source
  -> CLI build/package
  -> .destariapkg
```

The package must contain everything needed for runtime execution.

## Desktop Execution

```txt
.destariapkg
  -> Launcher
  -> Runtime
```

The launcher manages installed packages and runtime versions.

## Mobile Execution

```txt
TypeScript source
  -> CLI package --target mobile
  -> standalone app containing runtime and package
```

Mobile does not use the desktop launcher model.
