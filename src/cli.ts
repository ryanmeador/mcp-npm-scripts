#!/usr/bin/env node
/// <reference types="node" />
import { startServer } from './index.js';
import { existsSync, statSync } from 'fs';
import path from 'path';

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
  }
  await startServer(packageJsonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
