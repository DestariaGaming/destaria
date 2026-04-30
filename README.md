# destaria

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.13 or later

### Install Dependencies

```bash
bun install
```

### Run Checks

Run the full workspace check suite:

```bash
bun run check:all
```

This runs TypeScript, Oxfmt, and Oxlint checks across all workspace packages.

### Apply Automated Fixes

```bash
bun run fix:all
```

This applies Oxfmt formatting and safe Oxlint fixes across all workspace packages, then runs type checking.
