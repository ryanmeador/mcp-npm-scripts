# mcp-npm-scripts

Model Context Protocol (MCP) server that exposes your project's `package.json` scripts as MCP tools.

> Status: WIP skeleton. Currently just a hello-world placeholder.

## Goals

- One MCP tool per npm script in the nearest `package.json`.
- Lightweight runtime: published bundle is plain JS (ESM) with type declarations.
- Zero TypeScript requirement for consumers.

## Usage (skeleton)

Install (once published):

```bash
npm install --save-dev mcp-npm-scripts
```

Run the (placeholder) CLI:

```bash
npx mcp-npm-scripts
# → Hello, world!
```

Pass a name:

```bash
npx mcp-npm-scripts Alice
# → Hello, Alice!
```

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
