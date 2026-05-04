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
