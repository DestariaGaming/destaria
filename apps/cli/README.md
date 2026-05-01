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
