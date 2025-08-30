#!/usr/bin/env node
/// <reference types="node" />
import { hello } from './index.js';

// Simple CLI that prints hello world (will evolve into MCP server launcher)
const nameArg = process.argv.slice(2).join(' ');
const { message } = hello({ name: nameArg || undefined });
console.log(message);
