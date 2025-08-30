export interface HelloRequest {
  name?: string;
}

export interface HelloResponse {
  message: string;
}

export function hello(req: HelloRequest = {}): HelloResponse {
  const name = req.name?.trim() || 'world';
  return { message: `Hello, ${name}!` };
}

// Placeholder: future MCP server factory will be exported here.
export function createServer() {
  return {
    // minimal shape; will be replaced with real MCP server implementation
    start() {
      // no-op for now
    },
  };
}
