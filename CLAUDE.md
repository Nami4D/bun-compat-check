# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI tool that checks Node.js project dependency compatibility with Bun runtime. It scans a target project's `package.json`, performs static analysis of Node.js API usage in each dependency, detects native addons in `node_modules`, and outputs a compatibility report.

## Commands

- **Build:** `bun run build` (runs `tsc`)
- **Dev:** `bun run dev` (runs `tsx src/index.ts`)
- **Run built CLI:** `node dist/index.js [path] [--dev] [--json] [-v]`

No test framework or linter is configured.

## Architecture

Five TypeScript files under `src/`:

- **`src/index.ts`** — CLI entry point. Parses argv flags (`--dev`, `--json`, `-v`, `--optional`) and calls `checkProject()` then `printReport()`/`printJson()`. Exit code 1 if incompatible packages found, 2 on errors.
- **`src/node-compat.ts`** — Bun's compatibility table for Node.js built-in modules. Maps module names to `supported`/`partial`/`unsupported` status. Exports `lookupNodeApi()` for specifier normalization and lookup.
- **`src/analyzer.ts`** — Static analysis. Scans `.js/.mjs/.cjs` files in a package's `node_modules` directory, extracts `require()`/`import` of Node.js builtins via regex, and cross-references against the compatibility table. Returns only non-`supported` APIs.
- **`src/checker.ts`** — Core logic. `checkProject()` reads the target project's `package.json`, collects dependencies, and runs each through a 3-step pipeline: (1) native addon detection via filesystem signals, (2) Node.js API static analysis, (3) assume compatible. Returns a `CheckSummary` with categorized results and warnings.
- **`src/reporter.ts`** — Output formatting. `printReport()` renders a colorized terminal report grouped by status with detected API details and a migration readiness percentage. `printJson()` outputs raw JSON. Uses ANSI escape codes directly (no chalk dependency).

## Key Types

- `NodeApiStatus`: `"supported" | "partial" | "unsupported"`
- `CompatStatus`: `"incompatible" | "partial" | "compatible" | "unknown"`
- `DetectedApi`: `{ module: string, status: "partial" | "unsupported" }`
- `CheckResult`: per-package result with status, reason, detectedApis, source
- `CheckSummary`: aggregate counts + results array + warnings

## Contributing

The most impactful contributions are updating the Node.js API compatibility table in `src/node-compat.ts` as Bun releases new versions, and improving the static analysis in `src/analyzer.ts`.
