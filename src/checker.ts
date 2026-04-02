import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { analyzePackage, type DetectedApi } from "./analyzer.js";

export type CompatStatus = "incompatible" | "partial" | "compatible" | "unknown";

export interface CheckResult {
  name: string;
  version: string;
  status: CompatStatus;
  reason: string;
  detectedApis?: DetectedApi[];
  source: "native-detect" | "api-analysis" | "assumed-ok" | "no-node-modules";
}

export interface CheckSummary {
  total: number;
  compatible: number;
  partial: number;
  incompatible: number;
  unknown: number;
  results: CheckResult[];
  warnings: string[];
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Strings that indicate a package uses native addons.
 */
const NATIVE_ADDON_SIGNALS = [
  "binding.gyp",
  "node-gyp",
  "node-pre-gyp",
  "prebuild-install",
  "node-addon-api",
  "nan",
  "napi",
] as const;

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
 * Check if an installed package has native addon signals.
 */
function detectNativeAddon(projectPath: string, pkgName: string): boolean {
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
 * Check a single package for Bun compatibility.
 */
function checkPackage(
  projectPath: string,
  name: string,
  version: string
): CheckResult {
  // Step 1: Native addon detection
  if (detectNativeAddon(projectPath, name)) {
    return {
      name,
      version,
      status: "incompatible",
      reason:
        "Native addon detected (binding.gyp / node-gyp / N-API). Likely incompatible with Bun's JavaScriptCore engine.",
      source: "native-detect",
    };
  }

  // Step 2: Node.js API static analysis
  const pkgDir = join(projectPath, "node_modules", name);
  const analysis = analyzePackage(pkgDir);
  if (analysis.detectedApis.length > 0) {
    const hasUnsupported = analysis.detectedApis.some(
      (a) => a.status === "unsupported"
    );
    const moduleList = analysis.detectedApis.map((a) => a.module).join(", ");
    return {
      name,
      version,
      status: hasUnsupported ? "incompatible" : "partial",
      reason: hasUnsupported
        ? `Uses unsupported Node.js APIs: ${moduleList}`
        : `Uses partially supported Node.js APIs: ${moduleList}`,
      detectedApis: analysis.detectedApis,
      source: "api-analysis",
    };
  }

  // Step 3: Assume compatible
  return {
    name,
    version,
    status: "compatible",
    reason: "No incompatible Node.js API usage detected.",
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

  const warnings: string[] = [];
  const hasNodeModules = existsSync(join(resolvedPath, "node_modules"));

  if (!hasNodeModules && Object.keys(deps).length > 0) {
    warnings.push(
      "node_modules not found. Run `bun install` to enable full analysis."
    );
  }

  const results: CheckResult[] = [];

  for (const [name, version] of Object.entries(deps)) {
    if (!hasNodeModules) {
      results.push({
        name,
        version,
        status: "unknown",
        reason:
          "Cannot analyze — node_modules not found.",
        source: "no-node-modules",
      });
    } else {
      results.push(checkPackage(resolvedPath, name, version));
    }
  }

  // Sort: incompatible first, then partial, then unknown, then compatible
  const statusOrder: Record<string, number> = {
    incompatible: 0,
    partial: 1,
    unknown: 2,
    compatible: 3,
  };
  results.sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  );

  return {
    total: results.length,
    incompatible: results.filter((r) => r.status === "incompatible").length,
    partial: results.filter((r) => r.status === "partial").length,
    unknown: results.filter((r) => r.status === "unknown").length,
    compatible: results.filter((r) => r.status === "compatible").length,
    results,
    warnings,
  };
}
