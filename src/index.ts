#!/usr/bin/env node

import { checkProject } from "./checker.js";
import { printReport, printJson } from "./reporter.js";

interface CliFlags {
  path: string;
  excludeDev: boolean;
  optional: boolean;
  json: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliFlags {
  const flags: CliFlags = {
    path: ".",
    excludeDev: false,
    optional: false,
    json: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--exclude-dev":
        flags.excludeDev = true;
        break;
      case "--optional":
        flags.optional = true;
        break;
      case "--json":
        flags.json = true;
        break;
      case "--verbose":
      case "-v":
        flags.verbose = true;
        break;
      case "--help":
      case "-h":
        flags.help = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          flags.path = arg;
        }
    }
  }

  return flags;
}

function printHelp(): void {
  console.log(`
  bun-compat-check — Check Node.js project compatibility with Bun

  Usage:
    bun-compat-check [path] [options]

  Arguments:
    path              Path to project directory (default: current directory)

  Options:
    --exclude-dev     Exclude devDependencies from the check
    --optional        Include optionalDependencies in the check
    --json            Output results as JSON
    --verbose, -v     Show details for all packages (including compatible ones)
    --help, -h        Show this help message

  Examples:
    bun-compat-check                    Check current directory
    bun-compat-check ./my-project       Check a specific project
    bun-compat-check --exclude-dev      Exclude devDependencies
    bun-compat-check --json             Machine-readable output
    bun-compat-check -v                 Verbose output for all packages
`);
}

function main(): void {
  const args = process.argv.slice(2);
  const flags = parseArgs(args);

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const summary = checkProject(flags.path, {
      includeDev: !flags.excludeDev,
      includeOptional: flags.optional,
    });

    if (flags.json) {
      printJson(summary);
    } else {
      printReport(summary, flags.verbose);
    }

    // Exit code: 1 if any incompatible packages found
    if (summary.incompatible > 0) {
      process.exit(1);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
    } else {
      console.error("An unexpected error occurred.");
    }
    process.exit(2);
  }
}

main();
