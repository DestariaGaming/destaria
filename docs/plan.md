# Destaria Engine Plan

## Overview

Destaria is a TypeScript-first, code-driven game engine for developers who
prefer writing code over using editor-heavy tools.

It focuses on:

- simple, Git-friendly project structure
- reusable assets and scripts
- composable scene design
- clean separation between authoring, build, and runtime

The goal is to provide a lightweight, developer-centric foundation for building
small to medium games without unnecessary tooling friction. It is not trying to
compete directly with large editor-first engines.

## Core Philosophy

```txt
TypeScript = authoring
Package     = contract
Runtime     = execution
```

Developers write games in TypeScript. The engine converts that source into
structured package data. The runtime executes that data without depending on how
the project was authored.

This keeps failure modes easier to locate:

- authoring problems belong to user project code
- build and validation problems belong to the CLI
- execution problems belong to the runtime
- distribution problems belong to the launcher

## Goals

Destaria aims to provide:

- a code-first game development experience
- a clean and inspectable data model
- reusable and composable assets
- portable packaged games
- a simple desktop distribution model
- a workflow that feels like building software

## Non-Goals

Destaria is not:

- a replacement for Unity, Unreal, or Godot
- focused on AAA production pipelines
- dependent on heavy editor tooling
- designed for workflows where authors avoid writing code

## Product Direction

The intended developer flow is:

```txt
create project -> author in TypeScript -> run dev mode -> build package -> run package
```

The intended distribution flow is:

```txt
build .destariapkg -> install or open in launcher -> execute with runtime
```

Mobile targets are handled separately by bundling the runtime and package into a
standalone app, because mobile platforms do not fit the desktop launcher model.

## Near-Term Implementation Shape

The repo should grow along these lines:

1. Define shared package-format types.
2. Expand the CLI around project validation and package generation.
3. Add a minimal runtime that can load and execute packaged data.
4. Add development mode with watch and reload.
5. Add launcher responsibilities after package and runtime contracts stabilize.

## Summary

Destaria is built around a simple idea:

```txt
Write games in TypeScript, compile them into structured data, and run them in a
predictable runtime.
```

It separates development, execution, and distribution while keeping the developer
interface simple.
