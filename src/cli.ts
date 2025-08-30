#!/usr/bin/env node
/// <reference types="node" />
import { startServer } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    // For now just print a local greeting (dev convenience)
    const name = args.join(' ');
    console.log(`Hello, ${name || 'world'}!`);
    return;
  }
  await startServer();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
