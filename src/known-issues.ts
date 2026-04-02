/**
 * Database of known Bun compatibility issues with Node.js packages.
 *
 * Status levels:
 * - "incompatible": Will not work on Bun (native addons, V8-specific)
 * - "partial": Works with caveats or limited functionality
 * - "compatible": Works on Bun, but has a better Bun-native alternative
 * - "use-builtin": Bun has a built-in replacement
 */

export type CompatStatus =
  | "incompatible"
  | "partial"
  | "compatible"
  | "use-builtin";

export interface KnownIssue {
  status: CompatStatus;
  reason: string;
  alternative?: string;
  bunBuiltin?: string;
  link?: string;
}

export const KNOWN_ISSUES: Record<string, KnownIssue> = {
  // ── Native addon packages (V8-dependent, node-gyp) ──────────────────
  bcrypt: {
    status: "incompatible",
    reason: "Native C++ addon compiled against V8. Bun uses JavaScriptCore.",
    alternative: "bcryptjs (pure JS drop-in) or Bun.password built-in",
    bunBuiltin: "Bun.password",
    link: "https://bun.sh/docs/api/hashing",
  },
  canvas: {
    status: "incompatible",
    reason: "Native addon (node-canvas) requires V8 bindings. No clean workaround.",
    alternative: "@napi-rs/canvas (experimental Bun support) or use a headless browser",
  },
  "better-sqlite3": {
    status: "use-builtin",
    reason: "Native addon, but Bun has a faster built-in SQLite API.",
    bunBuiltin: "bun:sqlite",
    link: "https://bun.sh/docs/api/sqlite",
  },
  argon2: {
    status: "incompatible",
    reason: "Native addon using node-gyp.",
    alternative: "Bun.password with algorithm: 'argon2id'",
    bunBuiltin: "Bun.password",
  },
  "cpu-features": {
    status: "incompatible",
    reason: "Native addon for CPU feature detection.",
  },
  "node-sass": {
    status: "incompatible",
    reason: "Deprecated native addon. Use Dart Sass instead.",
    alternative: "sass (Dart Sass, pure JS)",
  },
  fsevents: {
    status: "partial",
    reason: "macOS-only native addon. Bun has partial support.",
  },

  // ── Packages with Bun built-in replacements ─────────────────────────
  dotenv: {
    status: "use-builtin",
    reason: "Bun automatically loads .env files without any package.",
    bunBuiltin: "Built-in .env loading",
    link: "https://bun.sh/docs/runtime/env",
  },
  "cross-env": {
    status: "use-builtin",
    reason: "Bun handles env variables cross-platform natively.",
    bunBuiltin: "Built-in env handling",
  },
  "node-fetch": {
    status: "use-builtin",
    reason: "Bun has a native global fetch() implementation.",
    bunBuiltin: "globalThis.fetch",
  },
  undici: {
    status: "use-builtin",
    reason: "Bun has a native HTTP client that's faster.",
    bunBuiltin: "globalThis.fetch / Bun.serve",
  },
  ws: {
    status: "use-builtin",
    reason: "Bun has a built-in WebSocket server and client.",
    bunBuiltin: "Bun.serve({ websocket })",
    link: "https://bun.sh/docs/api/websockets",
  },
  jest: {
    status: "use-builtin",
    reason: "Bun has a built-in test runner compatible with Jest API.",
    bunBuiltin: "bun test",
    link: "https://bun.sh/docs/cli/test",
  },
  vitest: {
    status: "compatible",
    reason: "Works on Bun, but bun test is faster and built-in.",
    bunBuiltin: "bun test",
  },
  "ts-node": {
    status: "use-builtin",
    reason: "Bun runs TypeScript natively without compilation.",
    bunBuiltin: "bun run file.ts",
  },
  tsx: {
    status: "use-builtin",
    reason: "Bun runs TypeScript/TSX natively.",
    bunBuiltin: "bun run file.tsx",
  },
  esbuild: {
    status: "use-builtin",
    reason: "Bun has a built-in bundler.",
    bunBuiltin: "Bun.build()",
    link: "https://bun.sh/docs/bundler",
  },
  nodemon: {
    status: "use-builtin",
    reason: "Bun has built-in watch mode.",
    bunBuiltin: "bun --watch / bun --hot",
  },

  // ── Partial compatibility ───────────────────────────────────────────
  sharp: {
    status: "partial",
    reason:
      "Sharp added WebAssembly fallback. Works in most configurations as of 2026, but verify your platform.",
    link: "https://sharp.pixelplumbing.com/install#bun",
  },
  prisma: {
    status: "partial",
    reason:
      'Works but requires adding "bun" to the engine in schema.prisma generator block.',
    link: "https://www.prisma.io/docs/orm/more/under-the-hood/engines",
  },
  puppeteer: {
    status: "partial",
    reason: "Core functionality works. Some edge cases with subprocess management.",
  },
  playwright: {
    status: "partial",
    reason: "Basic usage works. Some advanced features may have issues.",
  },
  "pg-native": {
    status: "incompatible",
    reason: "Native addon for PostgreSQL. Use 'pg' (pure JS) instead.",
    alternative: "pg",
  },
  sqlite3: {
    status: "incompatible",
    reason: "Native addon. Use Bun's built-in SQLite.",
    bunBuiltin: "bun:sqlite",
    alternative: "better-sqlite3 (also native) or bun:sqlite",
  },

  // ── Framework compatibility notes ───────────────────────────────────
  express: {
    status: "compatible",
    reason: "Works on Bun. Consider Bun.serve() or Elysia for better performance.",
  },
  fastify: {
    status: "compatible",
    reason: "Works on Bun with good compatibility.",
  },
  "next": {
    status: "partial",
    reason:
      "Next.js works with Bun for development and builds. Some edge runtime features may differ.",
  },
  nestjs: {
    status: "compatible",
    reason: "Works on Bun. Metadata reflection (reflect-metadata) is supported.",
  },
  "@nestjs/core": {
    status: "compatible",
    reason: "Works on Bun. Metadata reflection (reflect-metadata) is supported.",
  },
};

/**
 * Patterns that indicate a package might use native addons.
 */
export const NATIVE_ADDON_SIGNALS = [
  "binding.gyp",
  "node-gyp",
  "node-pre-gyp",
  "prebuild-install",
  "node-addon-api",
  "nan",
  "napi",
] as const;

/**
 * Package name patterns commonly associated with native addons.
 */
export const NATIVE_ADDON_NAME_PATTERNS = [
  /^@napi-rs\//,
  /^node-/,
  /-native$/,
  /-addon$/,
] as const;
