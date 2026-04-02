# bun-compat-check

Check your Node.js project's dependency compatibility with [Bun](https://bun.sh) runtime before migrating.

Scans your `package.json`, cross-references a curated database of known issues, detects native addons, and generates a compatibility report with migration suggestions.

## Install

```bash
# npm
npm install -g bun-compat-check

# bun (of course)
bun add -g bun-compat-check
```

Or use without installing:

```bash
npx bun-compat-check
bunx bun-compat-check
```

## Usage

```bash
# Check current directory
bun-compat-check

# Check a specific project
bun-compat-check ./my-project

# Include devDependencies
bun-compat-check --dev

# JSON output (for CI/CD pipelines)
bun-compat-check --json

# Verbose — show details for all packages
bun-compat-check -v
```

## Example Output

```
🔍 Bun Compatibility Report
──────────────────────────────────────────────────

❌ INCOMPATIBLE  bcrypt@5.1.1
   Native C++ addon compiled against V8. Bun uses JavaScriptCore.
   → Alternative: bcryptjs (pure JS drop-in) or Bun.password built-in
   → Bun built-in: Bun.password

⚠️  PARTIAL  sharp@0.33.2
   Sharp added WebAssembly fallback. Works in most configurations as of 2026, but verify your platform.

🔄 USE BUILTIN  dotenv@16.4.1
   Bun automatically loads .env files without any package.
   → Bun built-in: Built-in .env loading

🔄 USE BUILTIN  ws@8.16.0
   Bun has a built-in WebSocket server and client.
   → Bun built-in: Bun.serve({ websocket })

✅ OK  express@4.18.2
✅ OK  zod@3.22.4
✅ OK  typescript@5.7.2

──────────────────────────────────────────────────
Summary: 7 packages scanned

  ❌  1 incompatible — will not work on Bun
  ⚠️  1 partial — works with caveats
  🔄  2 replaceable — Bun has built-in alternatives
  ✅  3 compatible

Migration readiness: 71%
  → Minor adjustments needed. Check the items above.
```

## How It Works

1. **Known Issues Database** — Cross-references dependencies against a curated list of packages with known Bun compatibility issues, including alternatives and Bun built-in replacements.

2. **Native Addon Detection** — Scans installed `node_modules` for signals like `binding.gyp`, `node-gyp` scripts, and N-API usage that indicate V8-dependent native addons.

3. **Name Pattern Matching** — Flags packages with names matching common native addon patterns (`node-*`, `*-native`, `@napi-rs/*`).

4. **Migration Score** — Calculates a readiness percentage based on the ratio of compatible + replaceable packages.

## Status Labels

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Compatible | Works on Bun |
| 🔄 | Use Builtin | Works, but Bun has a faster built-in alternative |
| ⚠️ | Partial | Works with caveats or limited functionality |
| ❌ | Incompatible | Will not work on Bun (native addon / V8-specific) |
| ❓ | Unknown | Needs manual verification |

## CI/CD Integration

Use `--json` output and the exit code for automated checks:

```bash
# Exit code 1 if any incompatible packages found
bun-compat-check --json > compat-report.json || echo "Incompatible packages detected"
```

## Contributing

Contributions welcome! The most impactful way to help:

- **Add packages to the known issues database** (`src/known-issues.ts`)
- **Report false positives/negatives** via GitHub Issues
- **Improve native addon detection** heuristics

## License

MIT
