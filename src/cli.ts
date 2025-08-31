#!/usr/bin/env node
/// <reference types="node" />
import { startServer } from './index.js';
import { existsSync, statSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
  const args = process.argv.slice(2);
  let packageJsonPath: string | undefined;
  if (args.length > 0) {
    let provided = args[0];
    if (!existsSync(provided)) {
      console.error(`Path not found: ${provided}`);
      process.exit(1);
    }
    const stat = statSync(provided);
    if (stat.isDirectory()) {
      const candidate = path.join(provided, 'package.json');
      if (!existsSync(candidate)) {
        console.error(`Directory does not contain package.json: ${provided}`);
        process.exit(1);
      }
      packageJsonPath = candidate;
    } else {
      packageJsonPath = provided;
    }
  } else {
    // No explicit arg: look upward from CWD for nearest package.json that is NOT this tool's own.
    packageJsonPath = findNearestUserPackageJson();
  }
  await startServer(packageJsonPath);
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
  // cli.ts is under <root>/src/cli.ts -> project root is one directory above its directory
  const toolRoot = path.resolve(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
  let toolPkgName: string | undefined;
  try {
    const toolPkg = JSON.parse(readFileSync(path.join(toolRoot, 'package.json'), 'utf8'));
    if (toolPkg && typeof toolPkg.name === 'string') toolPkgName = toolPkg.name;
  } catch {
    /* ignore */
  }

  let dir = cwd;
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) {
      try {
        const json = JSON.parse(readFileSync(candidate, 'utf8'));
        const name: string | undefined = json?.name;
        const isToolByName = toolPkgName && name === toolPkgName;
        const isToolByPath = path.resolve(candidate) === path.join(toolRoot, 'package.json');
        if (!(isToolByName || isToolByPath)) {
          return candidate;
        }
      } catch {
        // ignore invalid JSON and continue upwards
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return undefined;
}
