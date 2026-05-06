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
  bin.ts             # executable CLI entrypoint
  cli.ts             # command registration
  index.ts           # public SDK exports
  source-registry.ts # source file discovery for build/dev/list commands
  output.ts          # shared human/json command output helpers
  build/             # build command implementation and tests
  shared/            # CLI test helpers and shared internals
```

Destaria source projects default to `source.root: "src"` in
`destaria.config.ts`. The CLI discovers `**/*.asset.ts` and `**/*.scene.ts`
under that root, which supports colocated layouts like
`src/levels/boss/boss.scene.ts`. Use `destaria list`, `destaria list scenes`, or
`destaria list assets --json` to inspect the files the CLI discovers.

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
