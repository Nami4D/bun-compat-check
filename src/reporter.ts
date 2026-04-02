import type { CheckResult, CheckSummary } from "./checker.js";

const ICONS: Record<string, string> = {
  incompatible: "❌",
  partial: "⚠️",
  unknown: "❓",
  compatible: "✅",
};

const LABELS: Record<string, string> = {
  incompatible: "INCOMPATIBLE",
  partial: "PARTIAL",
  unknown: "UNKNOWN",
  compatible: "OK",
};

const COLORS: Record<string, string> = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
};

function statusColor(status: string): string {
  switch (status) {
    case "incompatible":
      return COLORS.red;
    case "partial":
      return COLORS.yellow;
    case "unknown":
      return COLORS.magenta;
    case "compatible":
      return COLORS.green;
    default:
      return COLORS.reset;
  }
}

function formatResult(r: CheckResult, verbose: boolean): string {
  const icon = ICONS[r.status] ?? "?";
  const label = LABELS[r.status] ?? r.status;
  const color = statusColor(r.status);
  const lines: string[] = [];

  lines.push(
    `${icon} ${color}${COLORS.bold}${label}${COLORS.reset}  ${r.name}@${r.version}`
  );

  if (verbose || r.status !== "compatible") {
    lines.push(`   ${COLORS.dim}${r.reason}${COLORS.reset}`);

    if (r.detectedApis && r.detectedApis.length > 0) {
      for (const api of r.detectedApis) {
        const apiIcon = api.status === "unsupported" ? "✗" : "~";
        const apiColor =
          api.status === "unsupported" ? COLORS.red : COLORS.yellow;
        lines.push(
          `   ${apiColor}${apiIcon} node:${api.module} (${api.status})${COLORS.reset}`
        );
      }
    }
  }

  return lines.join("\n");
}

/**
 * Print a human-readable report to stdout.
 */
export function printReport(
  summary: CheckSummary,
  verbose: boolean = false
): void {
  console.log();
  console.log(`${COLORS.bold}🔍 Bun Compatibility Report${COLORS.reset}`);
  console.log(`${"─".repeat(50)}`);

  // Warnings
  for (const warn of summary.warnings) {
    console.log(`${COLORS.yellow}⚠ ${warn}${COLORS.reset}`);
  }

  console.log();

  // Group by status
  const groups: Record<string, CheckResult[]> = {};
  for (const r of summary.results) {
    const key = r.status;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const groupOrder = ["incompatible", "partial", "unknown", "compatible"];

  for (const status of groupOrder) {
    const items = groups[status];
    if (!items || items.length === 0) continue;

    for (const item of items) {
      console.log(formatResult(item, verbose));
    }
    console.log();
  }

  // Summary bar
  console.log(`${"─".repeat(50)}`);
  console.log(
    `${COLORS.bold}Summary:${COLORS.reset} ${summary.total} packages scanned`
  );
  console.log();

  if (summary.incompatible > 0) {
    console.log(
      `  ${ICONS.incompatible}  ${COLORS.red}${summary.incompatible} incompatible${COLORS.reset} — will not work on Bun`
    );
  }
  if (summary.partial > 0) {
    console.log(
      `  ${ICONS.partial}  ${COLORS.yellow}${summary.partial} partial${COLORS.reset} — uses partially supported APIs`
    );
  }
  if (summary.unknown > 0) {
    console.log(
      `  ${ICONS.unknown}  ${COLORS.magenta}${summary.unknown} unknown${COLORS.reset} — could not analyze`
    );
  }
  if (summary.compatible > 0) {
    console.log(
      `  ${ICONS.compatible}  ${COLORS.green}${summary.compatible} compatible${COLORS.reset}`
    );
  }

  console.log();

  // Migration readiness score (exclude unknown from calculation)
  const analyzedTotal = summary.total - summary.unknown;

  if (analyzedTotal === 0) {
    console.log(
      `${COLORS.dim}Migration readiness: N/A (no packages could be analyzed)${COLORS.reset}`
    );
  } else {
    const score = Math.round(
      ((analyzedTotal - summary.incompatible) / analyzedTotal) * 100
    );
    const scoreColor =
      score >= 80 ? COLORS.green : score >= 50 ? COLORS.yellow : COLORS.red;

    console.log(
      `${COLORS.bold}Migration readiness: ${scoreColor}${score}%${COLORS.reset}`
    );

    if (score >= 90) {
      console.log(
        `  ${COLORS.green}→ Your project is ready for Bun! 🚀${COLORS.reset}`
      );
    } else if (score >= 70) {
      console.log(
        `  ${COLORS.yellow}→ Minor adjustments needed. Check the items above.${COLORS.reset}`
      );
    } else if (score >= 50) {
      console.log(
        `  ${COLORS.yellow}→ Several packages need attention before migrating.${COLORS.reset}`
      );
    } else {
      console.log(
        `  ${COLORS.red}→ Significant compatibility issues. Consider staying on Node.js for now.${COLORS.reset}`
      );
    }
  }

  console.log();
}

/**
 * Output results as JSON.
 */
export function printJson(summary: CheckSummary): void {
  console.log(JSON.stringify(summary, null, 2));
}
