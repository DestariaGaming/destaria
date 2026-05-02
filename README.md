# destaria

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.13 or later

### Install Dependencies

```bash
bun install
```

### Install Third-Party Source Repos

This repo uses `.repos/*` for git submodules that expose third-party package
source for inspection, especially by agents. These repos are references only and
are not Bun workspace packages.

Current reference repos:

- `.repos/cli-forge`: CLI framework source.
- `.repos/zod`: schema validation source used by `@destaria/package-format`.

After cloning the repo, populate the pinned submodule commits:

```bash
bun run repos:install
```

To advance the source repos to their configured upstream branches, run:

```bash
bun run repos:update
```

Review and commit any resulting submodule pointer changes in this monorepo.

### Run Checks

Run the full workspace check suite:

```bash
bun run check:all
```

This runs TypeScript, Oxfmt, and Oxlint checks across all workspace packages.

### Workspace Packages

Current workspace packages:

- `apps/cli`: the `destaria` CLI and public SDK entrypoint.
- `packages/authoring`: TypeScript authoring helpers such as `Mesh.cube()`.
- `packages/package-format`: serializable `.destariapkg` data contracts and
  validation shared by build and runtime code.

The intended dependency direction is:

```txt
destaria CLI -> @destaria/authoring -> @destaria/package-format
runtime      -> @destaria/package-format
```

Runtime code should consume package-format data, not authoring helpers.

### Local Development

Bun can execute the CLI TypeScript entrypoint directly during development:

```bash
bun /path/to/destaria/apps/cli/src/bin.ts --help
```

For a shorter local command, add an alias to your shell config:

```bash
alias destaria='bun /path/to/destaria/apps/cli/src/bin.ts'
```

After reloading your shell, run the local CLI with:

```bash
destaria --help
```

### Apply Automated Fixes

```bash
bun run fix:all
```

This applies Oxfmt formatting and safe Oxlint fixes across all workspace packages, then runs type checking.
