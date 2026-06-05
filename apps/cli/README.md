# destaria

Developer CLI and public SDK entrypoint for Destaria.

The CLI owns project creation, development mode, validation, build, and
packaging. Its package entrypoint also re-exports authoring helpers that
Destaria projects can import from `destaria`.

## SDK Exports

```ts
import { Mesh } from "destaria";

const mesh = Mesh.cube();
```

The CLI package depends on `@destaria/authoring`, which in turn depends on
`@destaria/package-format` for serializable package data contracts.

## Source Layout

```txt
src/
  bin.ts              # executable CLI entrypoint
  cli.ts              # command registration
  index.ts            # public SDK exports
  compiler/            # shared source-to-package-data compilation
  commands/           # build/dev/list/package/create commands
  project/            # project config context and source discovery
  shared/             # shared output, paths, errors, and test helpers
```

Destaria source projects default to `source.root: "src"` in
`destaria.config.ts`. The CLI discovers `**/*.asset.ts` and `**/*.scene.ts`
under that root, which supports colocated layouts like
`src/levels/boss/boss.scene.ts`. Use `destaria list`, `destaria list scenes`, or
`destaria list assets --json` to inspect the files the CLI discovers.

`destaria build` compiles the configured entry scene and its referenced asset
variants. It writes `dist/asset-registry.json`; the validated scene graph and
manifest input are available in JSON command output.

`destaria package` compiles the same project data and writes
`dist/game.destariapkg`, an uncompressed archive containing the manifest, entry
scene, and asset registry. Use `--output releases/demo.destariapkg` to override
the package path inside the project.

## Scripts

- `bun run build`
- `bun run typecheck`
- `bun run fmt:check`
- `bun run fmt:fix`
- `bun run lint:check`
- `bun run lint:fix`
- `bun test`
- `bun run check:all`
- `bun run fix:all`
