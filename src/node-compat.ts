/**
 * Bun's compatibility status for Node.js built-in modules.
 *
 * Maintaining this table (~50 entries) is far more scalable than
 * tracking individual package compatibility (200M+ on npm).
 *
 * Reference: https://bun.sh/docs/runtime/nodejs-apis
 * Last verified: 2026-04-02
 */

export type NodeApiStatus = "supported" | "partial" | "unsupported";

export const NODE_BUILTINS_COMPAT: Record<string, NodeApiStatus> = {
  // ── Fully supported ──────────────────────────────────────────────
  assert: "supported",
  buffer: "supported",
  console: "supported",
  constants: "supported",
  dgram: "supported",
  diagnostics_channel: "supported",
  dns: "supported",
  events: "supported",
  fs: "supported",
  http: "supported",
  https: "supported",
  net: "supported",
  os: "supported",
  path: "supported",
  punycode: "supported",
  querystring: "supported",
  readline: "supported",
  stream: "supported",
  string_decoder: "supported",
  timers: "supported",
  tty: "supported",
  url: "supported",
  zlib: "supported",

  // ── Partially supported ──────────────────────────────────────────
  async_hooks: "partial",
  child_process: "partial",
  cluster: "partial",
  crypto: "partial",
  domain: "partial",
  http2: "partial",
  inspector: "partial",
  module: "partial",
  perf_hooks: "partial",
  process: "partial",
  sys: "partial",
  test: "partial",
  tls: "partial",
  util: "partial",
  v8: "partial",
  vm: "partial",
  wasi: "partial",
  worker_threads: "partial",

  // ── Unsupported ──────────────────────────────────────────────────
  repl: "unsupported",
  sqlite: "unsupported",
  trace_events: "unsupported",
};

const NODE_BUILTINS = new Set(Object.keys(NODE_BUILTINS_COMPAT));

/**
 * Look up the Bun compatibility status for a Node.js built-in module specifier.
 *
 * Handles:
 * - Bare names: "fs", "child_process"
 * - node: prefix: "node:fs", "node:child_process"
 * - Subpaths: "fs/promises", "node:stream/web"
 *
 * Returns null if the specifier is not a Node.js built-in.
 */
export function lookupNodeApi(
  specifier: string
): { module: string; status: NodeApiStatus } | null {
  // Strip node: prefix
  const bare = specifier.startsWith("node:") ? specifier.slice(5) : specifier;

  // Extract base module (e.g. "fs/promises" → "fs")
  const base = bare.split("/")[0];

  if (!NODE_BUILTINS.has(base)) {
    return null;
  }

  return { module: base, status: NODE_BUILTINS_COMPAT[base] };
}
