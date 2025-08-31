import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Create and configure the MCP server. Tools/resources can be added *after* connect
 * for dynamic behavior (the SDK automatically emits listChanged notifications).
 */
export function createServer() {
  const server = new McpServer({
    name: 'mcp-npm-scripts',
    version: '0.0.0',
  });
  // No built-in tools; all tools are derived from discovered npm scripts.

  return server;
}

/**
 * Convenience helper to start the server over stdio (default CLI transport).
 */
export async function startServer(packageJsonPath?: string) {
  const server = createServer();
  const transport = new StdioServerTransport();
  // Important: register tools BEFORE connecting; current SDK disallows capability registration after connect.
  if (packageJsonPath) {
    try {
      await registerScriptsFromPackageJson(server, packageJsonPath);
    } catch (err) {
      console.error('Failed to register npm script tools:', err);
    }
  }
  await server.connect(transport);
  return server;
}

/**
 * Dynamically add a new tool at runtime. May be called before or after startServer().
 */
export function addDynamicTool(
  server: ReturnType<typeof createServer>,
  name: string,
  description: string,
  schema: Record<string, any>,
  handler: (args: any) => Promise<any> | any,
) {
  return server.registerTool(name, { description, inputSchema: schema }, handler);
}

/**
 * Load a package.json, enumerate its scripts, and register an MCP tool for each script.
 * Tool naming: script name as-is (valid tool id chars per MCP spec assumed). Description defaults
 * to the script command text.
 */
export async function registerScriptsFromPackageJson(
  server: ReturnType<typeof createServer>,
  packageJsonPath: string,
) {
  const absPath = path.resolve(packageJsonPath);
  const pkgDir = path.dirname(absPath);
  const raw = await fs.readFile(absPath, 'utf8');
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${absPath}: ${(e as Error).message}`);
  }
  const scripts: Record<string, string> | undefined = json.scripts;
  if (!scripts || Object.keys(scripts).length === 0) {
    return; // nothing to add
  }

  const usedToolNames = new Set<string>();

  for (const [scriptName, scriptCmd] of Object.entries(scripts)) {
    const toolName = generateUniqueToolName(scriptName, usedToolNames, (server as any).tools);
    usedToolNames.add(toolName);

    // Avoid overriding existing tools that may have same sanitized name from earlier dynamic additions.
    if ((server as any).tools?.has(toolName)) continue;

    const description =
      scriptName === toolName
        ? `npm script: ${scriptCmd}`
        : `npm script (${scriptName}): ${scriptCmd}`;

    server.registerTool(
      toolName,
      {
        description,
        inputSchema: {}, // no inputs yet; future: allow args/env selection
      },
      async () => runNpmScript(pkgDir, scriptName), // always execute original name
    );
  }
}

/**
 * Sanitize an npm script name into a valid MCP tool id (allowed: [a-z0-9_-]).
 * Strategy:
 *  - lowercase
 *  - replace any run of disallowed chars with a single underscore
 *  - trim leading/trailing underscores
 *  - fallback to 'script' if empty after sanitation
 */
function sanitizeScriptName(name: string): string {
  const lowered = name.toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return replaced.length === 0 ? 'script' : replaced;
}

/**
 * Generate a unique tool name derived from the script name, avoiding collisions both within
 * this registration batch and any pre-existing server tools. Collisions append _2, _3, ...
 */
function generateUniqueToolName(
  original: string,
  used: Set<string>,
  existingTools: Map<string, any> | undefined,
) {
  const base = sanitizeScriptName(original);
  let candidate = base;
  let counter = 2;
  while (used.has(candidate) || existingTools?.has(candidate)) {
    candidate = `${base}_${counter++}`;
  }
  return candidate;
}

async function runNpmScript(cwd: string, script: string) {
  return new Promise<{ content: { type: 'text'; text: string }[] }>((resolve) => {
    // Deliberately omit --silent so that npm emits the usual two header lines (" > pkg@ver script" and the command),
    // giving users feedback for scripts whose underlying command (e.g. tsc) produces no stdout on success.
    const proc = spawn('npm', ['run', script], { cwd, env: process.env });
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.stderr.on('data', (d) => (output += d.toString()));
    proc.on('close', (code) => {
      resolve({
        content: [
          {
            type: 'text',
            text: output || `(script exited with code ${code}, no output)`,
          },
        ],
      });
    });
  });
}
