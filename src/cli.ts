#!/usr/bin/env node
/// <reference types="node" />
import { startServer } from './index.js';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
  const args = process.argv.slice(2);
  const packageJsonPath =
    args.length > 0 ? resolvePackageJsonInput(args[0]) : findNearestUserPackageJson();
  await startServer(packageJsonPath);
}

function resolvePackageJsonInput(provided: string): string | undefined {
  if (!existsSync(provided)) {
    console.error(`Path not found: ${provided}`);
    process.exit(1);
  }
  const stat = statSync(provided);
  if (!stat.isDirectory()) {
    return provided; // assume caller provided explicit package.json path (no additional validation here)
  }
  const candidate = path.join(provided, 'package.json');
  if (!existsSync(candidate)) {
    console.error(`Directory does not contain package.json: ${provided}`);
    process.exit(1);
  }
  return candidate;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Walk parent directories from current working directory to locate the nearest package.json
 * whose name is not this tool's own (to avoid registering the dev server's scripts).
 */
function findNearestUserPackageJson(): string | undefined {
  const cwd = process.cwd();
  // Determine this tool's own package.json path so we can skip it while walking upward.
  const toolPkgPath = path.resolve(
    path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'package.json'),
  );

  let dir = cwd;
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) {
      // Skip the tool's own package.json; otherwise return the first one we find.
      if (path.resolve(candidate) !== toolPkgPath) {
        return candidate;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return undefined;
}
