import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
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

  // Built‑in PoC hello tool (mirrors original behavior)
  server.registerTool(
    'hello',
    {
      description: 'Return a friendly greeting',
      inputSchema: { name: z.string().describe('Name to greet').optional() },
    },
    async ({ name }) => ({
      content: [
        {
          type: 'text',
          text: `Hello, ${(name ?? 'world').trim()}!`,
        },
      ],
    }),
  );

  return server;
}

/**
 * Convenience helper to start the server over stdio (default CLI transport).
 */
export async function startServer(packageJsonPath?: string) {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (packageJsonPath) {
    try {
      await registerScriptsFromPackageJson(server, packageJsonPath);
    } catch (err) {
      console.error('Failed to register npm script tools:', err);
    }
  }
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

  for (const [scriptName, scriptCmd] of Object.entries(scripts)) {
    // Avoid accidentally overriding existing tools; skip if already present
    if ((server as any).tools?.has(scriptName)) continue;
    server.registerTool(
      scriptName,
      {
        description: `npm script: ${scriptCmd}`,
        inputSchema: {}, // no inputs for now
      },
      async () => {
        return runNpmScript(pkgDir, scriptName);
      },
    );
  }
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
