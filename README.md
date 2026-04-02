# bun-compat-check

Check your Node.js project's dependency compatibility with [Bun](https://bun.sh) runtime before migrating.

Scans your `package.json`, performs static analysis of Node.js API usage in each dependency, detects native addons, and generates a compatibility report.

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

# Exclude devDependencies
bun-compat-check --exclude-dev

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
   Native addon detected (binding.gyp / node-gyp / N-API). Likely incompatible
   with Bun's JavaScriptCore engine.

❌ INCOMPATIBLE  some-tracer@2.0.0
   Uses unsupported Node.js APIs: trace_events
   ✗ node:trace_events (unsupported)

⚠️  PARTIAL  my-worker-lib@1.3.0
   Uses partially supported Node.js APIs: worker_threads, vm
   ~ node:worker_threads (partial)
   ~ node:vm (partial)

✅ OK  express@4.18.2
✅ OK  zod@3.22.4
✅ OK  typescript@5.7.2

──────────────────────────────────────────────────
Summary: 6 packages scanned

  ❌  2 incompatible — will not work on Bun
  ⚠️  1 partial — uses partially supported APIs
  ✅  3 compatible

Migration readiness: 67%
  → Several packages need attention before migrating.
```

## How It Works

1. **Native Addon Detection** — Scans installed `node_modules` for signals like `binding.gyp`, `node-gyp` scripts, and N-API usage that indicate V8-dependent native addons.

2. **Node.js API Static Analysis** — Scans `.js/.mjs/.cjs` files in each package for `require()` and `import` of Node.js built-in modules, then cross-references against Bun's compatibility table to flag unsupported or partially supported APIs. The compatibility table is maintained in [`src/node-compat.ts`](src/node-compat.ts) (last verified: 2026-04-02).

3. **Migration Score** — Calculates a readiness percentage based on the ratio of non-incompatible packages (excludes packages that couldn't be analyzed).

## Status Labels

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Compatible | No incompatible Node.js API usage detected |
| ⚠️ | Partial | Uses Node.js APIs with partial Bun support |
| ❌ | Incompatible | Native addon or uses unsupported Node.js APIs |
| ❓ | Unknown | Could not analyze (e.g. node_modules missing) |

## CI/CD Integration

Use `--json` output and the exit code for automated checks:

```bash
# Exit code 1 if any incompatible packages found
bun-compat-check --json > compat-report.json || echo "Incompatible packages detected"
```

## Contributing

Contributions welcome! The most impactful ways to help:

- **Update the Node.js API compatibility table** as Bun releases new versions (`src/node-compat.ts`)
- **Improve static analysis accuracy** (`src/analyzer.ts`)
- **Report false positives/negatives** via GitHub Issues

## Support

If you find this tool useful, consider supporting the project:

- [GitHub Sponsors](https://github.com/sponsors/Nami4D)
- [Ko-fi](https://ko-fi.com/nami4d)

## License

MIT
