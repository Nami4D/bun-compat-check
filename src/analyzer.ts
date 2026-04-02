/**
 * Static analysis of Node.js API usage in packages.
 *
 * Scans .js/.mjs/.cjs files in a package directory for require() and import
 * statements referencing Node.js built-in modules, then cross-references
 * against Bun's compatibility table.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { lookupNodeApi, type NodeApiStatus } from "./node-compat.js";

const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const MAX_DEPTH = 5;
const MAX_FILES = 200;
const MAX_FILE_SIZE = 1_048_576; // 1 MB

/**
 * Detected usage of a Node.js API that is not fully supported by Bun.
 */
export interface DetectedApi {
  module: string;
  status: "partial" | "unsupported";
}

/**
 * Result of analyzing a single package.
 */
export interface AnalysisResult {
  detectedApis: DetectedApi[];
}

// Matches: require('fs'), require("node:vm"), from 'fs', from "node:vm", import('fs'), import("node:vm")
const API_PATTERN =
  /(?:require\s*\(\s*|from\s+|import\s*\(\s*)(['"])([^'"]+)\1/g;

/**
 * Recursively collect .js/.mjs/.cjs files in a directory.
 * Skips nested node_modules and hidden directories.
 */
function collectFiles(dir: string, depth: number, files: string[]): void {
  if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES) return;

    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(fullPath, depth + 1, files);
    } else if (JS_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
}

/**
 * Extract Node.js built-in module specifiers from file content.
 */
function extractApis(content: string): Set<string> {
  const apis = new Set<string>();
  API_PATTERN.lastIndex = 0;
  let match;
  while ((match = API_PATTERN.exec(content)) !== null) {
    apis.add(match[2]);
  }
  return apis;
}

/**
 * Analyze a package directory for Node.js API usage.
 *
 * Scans source files and returns only APIs that are not fully supported by Bun.
 */
export function analyzePackage(pkgDir: string): AnalysisResult {
  if (!existsSync(pkgDir)) {
    return { detectedApis: [] };
  }

  const files: string[] = [];
  collectFiles(pkgDir, 0, files);

  const foundModules = new Set<string>();

  for (const file of files) {
    try {
      const stat = statSync(file);
      if (stat.size > MAX_FILE_SIZE) continue;

      const content = readFileSync(file, "utf-8");
      const specifiers = extractApis(content);

      for (const specifier of specifiers) {
        const result = lookupNodeApi(specifier);
        if (result && result.status !== "supported") {
          foundModules.add(result.module);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  const detectedApis: DetectedApi[] = [];
  for (const mod of foundModules) {
    const result = lookupNodeApi(mod);
    if (result && result.status !== "supported") {
      detectedApis.push({
        module: result.module,
        status: result.status as "partial" | "unsupported",
      });
    }
  }

  // Sort: unsupported first, then partial, then alphabetically
  detectedApis.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "unsupported" ? -1 : 1;
    }
    return a.module.localeCompare(b.module);
  });

  return { detectedApis };
}
