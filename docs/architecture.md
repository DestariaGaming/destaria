# Architecture

Destaria is split into three core components:

```txt
1. CLI      -> development and build tool
2. Runtime  -> packaged game execution
3. Launcher -> desktop distribution and execution shell
```

Each component has one primary responsibility and communicates through the shared
package format documented in [package-format.md](package-format.md).

The repo also includes SDK packages used by these components:

- `@destaria/authoring`: TypeScript authoring helpers for source projects.
- `@destaria/package-format`: serializable data contracts shared by the CLI and
  runtime.

## CLI

The CLI is the developer's main interface.

Responsibilities:

- create and manage projects
- run development mode with watch and reload
- compile assets and scenes
- bundle scripts
- validate project structure
- build and package games

Primary output:

```txt
dist/
  game.destariapkg
```

Architectural decision:

- The CLI is the only component that understands TypeScript source projects.
- The CLI translates source layout into the package contract consumed by runtime
  and launcher.
- The CLI may use authoring helpers to load or validate source declarations, but
  its output must be package-format data.

## Runtime

The runtime is the engine execution layer.

Responsibilities:

- rendering, initially WebGPU or WebGL
- scene loading
- entity system
- script execution
- input
- audio
- UI
- save and load systems

Key rule:

```txt
Runtime executes data, not TypeScript source.
```

Architectural decision:

- The runtime must not depend on the developer's folder structure, naming
  conventions, or TypeScript project layout.
- The runtime should depend on `@destaria/package-format`, not
  `@destaria/authoring`.
- Runtime APIs should expose controlled capabilities to scripts rather than
  internal engine objects.

## Launcher

The launcher handles desktop distribution and local execution.

Responsibilities:

- install and manage game packages
- launch games in a native window
- manage runtime versions
- handle save data
- eventually provide a game library UI

Desktop model:

```txt
Launcher installed once
+ .destariapkg files as games
```

Architectural decision:

- Desktop games should not require rebuilding a full native executable for every
  package.
- The launcher coordinates execution; it does not compile or package source.

## Component Constraints

These constraints keep ownership clear:

- CLI owns build and tooling.
- Runtime owns execution.
- Launcher owns distribution.
- Runtime does not know about TypeScript source.
- CLI does not act as the long-term packaged-game runtime.
- Launcher does not build games.
- All assets and scenes must resolve to structured package data.

Package dependency direction should stay pointed at the data contract:

```txt
@destaria/authoring -> @destaria/package-format
destaria CLI        -> @destaria/authoring
runtime             -> @destaria/package-format
```

When in doubt, keep the dependency direction pointed toward the package contract:

```txt
Source project -> CLI -> .destariapkg -> Runtime
                                |
                                v
                             Launcher
```
