#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const HELP = `nalloc-codemod - migrate a project from neverthrow to nalloc

Usage:
  nalloc-codemod <paths...> [--report <file>] [--dry]

Arguments:
  paths            Files or directories to migrate (.ts/.tsx/.mts/.cts, .d.ts and node_modules skipped)

Options:
  --report <file>  Write a markdown report of sites needing manual review
  --dry            Analyze and report without writing any files
  --help           Show this help

Migrate the whole project in one run: converted call sites assume their Result
values are nalloc values, which only holds once constructors are converted too.
`;

const SOURCE_EXT = /\.(ts|tsx|mts|cts)$/;

function collectFiles(path: string, files: string[]): void {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      collectFiles(join(path, entry), files);
    }
  } else if (SOURCE_EXT.test(path) && !path.endsWith('.d.ts')) {
    files.push(path);
  }
}

const paths: string[] = [];
let reportPath: string | undefined;
let dry = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help') {
    console.log(HELP);
    process.exit(0);
  } else if (arg === '--dry') {
    dry = true;
  } else if (arg === '--report') {
    reportPath = args[++i];
    if (reportPath === undefined) {
      console.error('--report requires a file path');
      process.exit(1);
    }
  } else {
    paths.push(arg);
  }
}

if (paths.length === 0) {
  console.log(HELP);
  process.exit(1);
}

const codemod = await (async () => {
  try {
    return await import('./codemod.js');
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_MODULE_NOT_FOUND' && String(error).includes('oxc-parser')) {
      console.error('nalloc-codemod requires the optional peer oxc-parser. Install it first:\n\n  npm install -D oxc-parser\n');
      process.exit(1);
    }
    throw error;
  }
})();

const files: string[] = [];
for (const path of paths) {
  collectFiles(path, files);
}

let filesChanged = 0;
let converted = 0;
const skipped = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const result = codemod.migrateSource(source, file);
  converted += result.converted;
  skipped.push(...result.skipped);
  if (result.changed) {
    filesChanged++;
    if (!dry) {
      writeFileSync(file, result.output);
    }
  }
}

const report = { filesChanged, converted, skipped };
if (reportPath !== undefined) {
  writeFileSync(reportPath, codemod.renderReport(report));
}
console.log(
  `${dry ? '[dry run] ' : ''}${files.length} files scanned, ${filesChanged} changed, ${converted} sites converted, ${skipped.length} need manual review${reportPath !== undefined ? ` (see ${reportPath})` : ''}`,
);
if (skipped.length > 0 && reportPath === undefined) {
  for (const site of skipped) {
    console.log(`  ${site.file}:${site.line} [${site.reason}] ${site.text}`);
  }
}
