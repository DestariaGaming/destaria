# Agent Guide

This repository contains Destaria, a TypeScript-first, code-driven game engine.
The project is early-stage, so preserve the architectural boundaries in the docs
even when implementing small pieces.

## Start Here

- Product and roadmap intent: [docs/plan.md](docs/plan.md)
- Architecture decisions: [docs/architecture.md](docs/architecture.md)
- Package contract: [docs/package-format.md](docs/package-format.md)
- Authoring workflow: [docs/authoring-workflow.md](docs/authoring-workflow.md)

## Repository Shape

```txt
apps/
  cli/              # Developer CLI package
packages/
  authoring/        # TypeScript authoring API helpers
  package-format/   # Serializable .destariapkg contracts
docs/              # Product, architecture, and workflow docs
.repos/            # Third-party source repos for reference only
```

Current workspace packages:

- `apps/cli`: the Destaria CLI package and public SDK entrypoint.
- `packages/authoring`: authoring helpers that produce package-format data.
- `packages/package-format`: serializable package contracts and validation
  shared by build and runtime code.

Expected future package boundaries:

- CLI code belongs in `apps/cli`.
- Authoring helpers belong in `packages/authoring`.
- Shared package contracts and validation belong in `packages/package-format`.
- Runtime and launcher code should be added as separate workspace packages or
  apps rather than folded into the CLI.

Third-party source references:

- `.repos/*` contains git submodules for packages the project may use or study.
- `.repos/cli-forge` contains the CLI framework source.
- `.repos/zod` contains the schema validation source used by package-format.
- Use these repos to inspect third-party APIs, implementation details, and
  behavior when planning or implementing integrations.
- Do not treat `.repos/*` as Destaria workspace code, import from it as local
  packages, or edit its contents unless explicitly updating submodule pointers.

## Core Architecture Rules

Keep these boundaries intact:

- CLI owns project creation, development mode, validation, build, and packaging.
- Runtime owns execution of packaged game data.
- Launcher owns desktop package management and launch orchestration.
- Runtime must not depend on TypeScript source project layout.
- Launcher must not build games.
- CLI should not become the long-term packaged-game runtime.
- CLI, Runtime, and Launcher communicate through the `.destariapkg` contract.
- Runtime should depend on package-format contracts, not authoring helpers.

The key model is:

```txt
TypeScript authoring -> structured package data -> runtime execution
```

## Tooling

Use Bun by default.

- Use `bun install` for dependencies.
- Use `bun run <script>` for package scripts.
- Use `bun test` for tests.
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`.
- Use `bunx <package> <command>` instead of `npx`.

Root scripts:

- `bun run check:all`: run workspace checks.
- `bun run fix:all`: run format and lint fixes, then typecheck.
- `bun run repos:install`: initialize and sync `.repos` submodules to the
  commits pinned by this repo.
- `bun run repos:update`: update `.repos` submodules from their configured
  upstream branches and leave pointer changes to review and commit.

CLI package scripts:

- `bun run typecheck`
- `bun run fmt:check`
- `bun run fmt:fix`
- `bun run lint:check`
- `bun run lint:fix`
- `bun run check:all`
- `bun run fix:all`

Workspace package scripts:

- `bun run build`
- `bun run typecheck`
- `bun run fmt:check`
- `bun run fmt:fix`
- `bun run lint:check`
- `bun run lint:fix`
- `bun run test`
- `bun run check:all`
- `bun run fix:all`

## Code Style

- TypeScript first.
- Keep implementation scoped to the package that owns the responsibility.
- Prefer explicit structured data contracts over ad hoc string formats.
- Add shared abstractions only after more than one package needs them.
- Before adding a helper inside the file or feature area where it is first
  needed, check for existing shared utilities. CLI utilities shared by build,
  dev, list, package, or validation code belong under `apps/cli/src/shared/`;
  test-only CLI helpers belong under `apps/cli/src/shared/test/`.
- Do not place reusable CLI helpers under `apps/cli/src/build/` unless they are
  genuinely build-only. Build-specific code can depend on `apps/cli/src/shared/`,
  but shared CLI code should not depend on build internals.
- Add clear TS/JSDoc comments for public-facing API exports, including exported
  functions, classes, constants, and types that developers consume from package
  entrypoints.
- Keep docs updated when changing component boundaries, package format, or
  workflow assumptions.

## Bun Runtime Preferences

- Prefer `Bun.file` over `node:fs` helpers where it fits the code.
- Prefer `Bun.serve()` for Bun-hosted services instead of Express.
- Prefer built-in Bun APIs before adding dependencies:
  - `bun:sqlite` for SQLite
  - `Bun.redis` for Redis
  - `Bun.sql` for Postgres
  - built-in `WebSocket`
- Bun loads `.env` automatically; do not add `dotenv`.

## Verification

Before handing off meaningful code changes, run the narrowest relevant check.
For repo-wide changes, use:

```sh
bun run check:all
```

## Pull Requests

When creating GitHub pull requests, follow the template in
[.github/pull_request_template.md](.github/pull_request_template.md). Preserve
the template section headings and fill them with the relevant behavior changes,
linked issues, verification notes, and any additional context.
