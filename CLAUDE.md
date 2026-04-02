# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI tool that checks Node.js project dependency compatibility with Bun runtime. It scans a target project's `package.json`, cross-references a curated known-issues database, detects native addons in `node_modules`, and outputs a compatibility report with migration suggestions.

## Commands

- **Build:** `npm run build` (runs `tsc`)
- **Dev:** `npm run dev` (runs `tsx src/index.ts`)
- **Run built CLI:** `node dist/index.js [path] [--dev] [--json] [-v]`

No test framework or linter is configured.

## Architecture

Four TypeScript files under `src/`:

- **`src/index.ts`** — CLI entry point. Parses argv flags (`--dev`, `--json`, `-v`, `--optional`) and calls `checkProject()` then `printReport()`/`printJson()`. Exit code 1 if incompatible packages found, 2 on errors.
- **`src/checker.ts`** — Core logic. `checkProject()` reads the target project's `package.json`, collects dependencies (optionally including dev/optional), and runs each through a 4-step check pipeline: (1) known-issues DB lookup, (2) native addon detection via filesystem signals in `node_modules`, (3) package name pattern matching, (4) assume compatible. Returns a `CheckSummary` with categorized results.
- **`src/known-issues.ts`** — Curated `Record<string, KnownIssue>` mapping package names to compatibility status (`incompatible`, `partial`, `compatible`, `use-builtin`), reasons, alternatives, and Bun built-in replacements. Also exports `NATIVE_ADDON_SIGNALS` (strings like `node-gyp`, `nan`) and `NATIVE_ADDON_NAME_PATTERNS` (regexes like `/^@napi-rs\//`).
- **`src/reporter.ts`** — Output formatting. `printReport()` renders a colorized terminal report grouped by status with a migration readiness percentage. `printJson()` outputs raw JSON. Uses ANSI escape codes directly (no chalk dependency).

## Key Types

- `CompatStatus`: `"incompatible" | "partial" | "compatible" | "use-builtin"`
- `CheckResult`: per-package result with status, reason, source (which detection step matched)
- `CheckSummary`: aggregate counts + array of `CheckResult`

## Contributing

The most impactful contribution is adding entries to `KNOWN_ISSUES` in `known-issues.ts`. Each entry maps a package name to its `KnownIssue` with status, reason, and optionally an alternative or Bun built-in replacement.
