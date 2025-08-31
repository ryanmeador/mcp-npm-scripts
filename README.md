# mcp-npm-scripts

Model Context Protocol (MCP) server that exposes your project's `package.json` scripts as MCP tools.

> Status: Early WIP. API subject to change; feedback welcome.

## Goals

- One MCP tool per npm script in the nearest `package.json`.
- Lightweight runtime: published bundle is plain JS (ESM) with type declarations.
- Zero TypeScript requirement for consumers.

## Usage

Install (once published):

```bash
npm install --save-dev mcp-npm-scripts
```

Start the MCP server pointing at your project (directory or explicit package.json):

```bash
npx mcp-npm-scripts ./path/to/project
# or
npx mcp-npm-scripts ./path/to/project/package.json
```

Every npm script inside that `package.json` becomes an MCP tool. Script names are sanitized to valid tool ids: lowercase, any run of disallowed characters replaced with a single underscore, trimmed, with numeric suffixes added on collision. Invoking a tool runs `npm run <original-script-name>` in the package directory and returns combined stdout/stderr as a text response.

If no path is provided, the server currently starts with zero tools (you must point it at a project to register scripts).

## Development

```bash
npm install
npm run dev # watch mode
npm run build
```

## Roadmap

- Implement MCP protocol server.
- Discover nearest `package.json` and enumerate scripts.
- Map each script to an MCP tool definition.
- Execute scripts with streamed output.
- Caching / debounce for script list.
- Config options (script include/exclude patterns, working directory, env passthrough).

## License

MIT
