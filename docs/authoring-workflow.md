# Authoring Workflow

Destaria authoring is TypeScript-first. Source projects describe assets, scenes,
entities, and scripts. The CLI turns those descriptions into package data.

## Authoring Model

Developers define:

- assets: reusable things in the world
- scenes: where things exist
- entities: instances placed in scenes
- scripts: runtime behavior

## Project Config

Destaria projects define their CLI entrypoint and output settings in
`destaria.config.ts` at the project root:

```ts
import { defineConfig } from "destaria";

export default defineConfig({
  entry: "src/scenes/main.scene.ts",
  output: {
    dir: "dist",
  },
});
```

The CLI loads this config once per command invocation and exposes the effective
project context to build, dev, and package internals. Command-line overrides,
such as `--project` and `--output`, are merged into that context before
downstream work reads it.

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
import { defineAsset, Mesh } from "destaria";

export const Crate = defineAsset({
  mesh() {
    return Mesh.cube({ size: 2 });
  },
});
```

This creates a descriptor for the CLI to include in compiled asset metadata. It
does not create runtime geometry or renderer-specific objects.

Assets that need authored configuration use typed JSON-safe props:

```ts
import { defineAsset, Mesh } from "destaria";

type CrateProps = {
  size: "small" | "large";
  isExplosive: boolean;
};

export const Crate = defineAsset<CrateProps>({
  defaultProps: {
    size: "small",
    isExplosive: false,
  },
  mesh(props) {
    return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube({ size: 2 });
  },
});
```

`mesh(props)` can produce different package data for different effective entity
props. Default props are fallback authoring data, not a request to compile every
possible asset variant. Once scene/entity compilation is in place, the CLI
should compile asset outputs for referenced entity variants.

## Scenes

Scenes describe world contents.

Examples:

- entities
- lights
- cameras
- layout

Scenes should compile into structured data that the runtime can load without
inspecting the original TypeScript source.

The scene authoring helper is `defineScene(...)`, which creates a source-side
container for entity placements:

```ts
import { defineAsset, defineScene, entity, Mesh } from "destaria";

const Crate = defineAsset({
  mesh() {
    return Mesh.cube();
  },
});

export const MainScene = defineScene({
  entities: [entity(Crate).at(0, 0, 0)],
});
```

Scene definitions snapshot entity builders with `toDescriptor()` for later CLI
compilation. They do not resolve asset IDs, evaluate asset meshes,
serialize package data, or create runtime scene objects.

## Entities

An entity is an instance of an asset placed in a scene.

Entities can have:

- transform
- scene-local configuration
- attached scripts
- references to assets or other entities

The first entity authoring helper is `entity(asset)`, which creates an
authoring-side placement descriptor:

```ts
import { appendDefault, defineAsset, entity, Mesh } from "destaria";

type CrateProps = {
  size: "small" | "large";
  isExplosive: boolean;
  tags: string[];
};

export const Crate = defineAsset<CrateProps>({
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

Entity descriptors preserve the referenced asset definition token, effective
JSON-safe props, and position transform. They are source-side snapshots for the
CLI to resolve during scene compilation; they do not contain package asset IDs
and do not create runtime entity objects.

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
