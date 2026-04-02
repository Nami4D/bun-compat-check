import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  KNOWN_ISSUES,
  NATIVE_ADDON_SIGNALS,
  NATIVE_ADDON_NAME_PATTERNS,
  type CompatStatus,
  type KnownIssue,
} from "./known-issues.js";

export interface CheckResult {
  name: string;
  version: string;
  status: CompatStatus | "unknown";
  reason: string;
  alternative?: string;
  bunBuiltin?: string;
  link?: string;
  source: "known-db" | "native-detect" | "name-pattern" | "assumed-ok";
}

export interface CheckSummary {
  total: number;
  compatible: number;
  useBuiltin: number;
  partial: number;
  incompatible: number;
  unknown: number;
  results: CheckResult[];
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Read and parse a package.json file.
 */
export function readPackageJson(projectPath: string): PackageJson {
  const pkgPath = resolve(projectPath, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found at ${pkgPath}`);
  }
  const raw = readFileSync(pkgPath, "utf-8");
  return JSON.parse(raw) as PackageJson;
}

/**
 * Check if an installed package has native addon signals in its own package.json.
 */
function detectNativeAddon(
  projectPath: string,
  pkgName: string
): boolean {
  const pkgDir = join(projectPath, "node_modules", pkgName);
  const pkgJsonPath = join(pkgDir, "package.json");

  if (!existsSync(pkgJsonPath)) {
    return false;
  }

  try {
    const raw = readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(raw);

    // Check for binding.gyp
    if (existsSync(join(pkgDir, "binding.gyp"))) {
      return true;
    }

    // Check install scripts that invoke node-gyp
    const scripts = pkg.scripts || {};
    const installScript =
      scripts.install || scripts.preinstall || scripts.postinstall || "";
    if (
      NATIVE_ADDON_SIGNALS.some((signal) =>
        installScript.toLowerCase().includes(signal)
      )
    ) {
      return true;
    }

    // Check dependencies for native addon tooling
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
    };
    for (const signal of NATIVE_ADDON_SIGNALS) {
      if (allDeps[signal]) {
        return true;
      }
    }

    // Check gypfile flag
    if (pkg.gypfile === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a package name matches known native addon patterns.
 */
function matchesNativePattern(pkgName: string): boolean {
  return NATIVE_ADDON_NAME_PATTERNS.some((pattern) => pattern.test(pkgName));
}

/**
 * Check a single package for Bun compatibility.
 */
function checkPackage(
  projectPath: string,
  name: string,
  version: string
): CheckResult {
  // 1. Check known issues database
  const known = KNOWN_ISSUES[name];
  if (known) {
    return {
      name,
      version,
      status: known.status,
      reason: known.reason,
      alternative: known.alternative,
      bunBuiltin: known.bunBuiltin,
      link: known.link,
      source: "known-db",
    };
  }

  // 2. Detect native addons from installed node_modules
  if (detectNativeAddon(projectPath, name)) {
    return {
      name,
      version,
      status: "partial",
      reason:
        "Detected native addon (binding.gyp / node-gyp). May not work on Bun due to V8/JSC incompatibility.",
      source: "native-detect",
    };
  }

  // 3. Check name patterns
  if (matchesNativePattern(name)) {
    return {
      name,
      version,
      status: "unknown",
      reason:
        "Package name suggests it may contain native bindings. Verify manually.",
      source: "name-pattern",
    };
  }

  // 4. Assume compatible
  return {
    name,
    version,
    status: "compatible" as CompatStatus,
    reason: "No known issues. Pure JS/TS packages generally work on Bun.",
    source: "assumed-ok",
  };
}

export interface CheckOptions {
  includeDev?: boolean;
  includeOptional?: boolean;
}

/**
 * Run compatibility check on all dependencies.
 */
export function checkProject(
  projectPath: string,
  options: CheckOptions = {}
): CheckSummary {
  const { includeDev = false, includeOptional = false } = options;
  const pkg = readPackageJson(projectPath);
  const resolvedPath = resolve(projectPath);

  const deps: Record<string, string> = {
    ...(pkg.dependencies || {}),
    ...(includeDev ? pkg.devDependencies || {} : {}),
    ...(includeOptional ? pkg.optionalDependencies || {} : {}),
  };

  const results: CheckResult[] = [];

  for (const [name, version] of Object.entries(deps)) {
    results.push(checkPackage(resolvedPath, name, version));
  }

  // Sort: incompatible first, then partial, then use-builtin, then unknown, then compatible
  const statusOrder: Record<string, number> = {
    incompatible: 0,
    partial: 1,
    "use-builtin": 2,
    unknown: 3,
    compatible: 4,
  };
  results.sort(
    (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
  );

  return {
    total: results.length,
    incompatible: results.filter((r) => r.status === "incompatible").length,
    partial: results.filter((r) => r.status === "partial").length,
    useBuiltin: results.filter((r) => r.status === "use-builtin").length,
    unknown: results.filter((r) => r.status === "unknown").length,
    compatible: results.filter((r) => r.status === "compatible").length,
    results,
  };
}
