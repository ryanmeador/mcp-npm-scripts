import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

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
export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
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
