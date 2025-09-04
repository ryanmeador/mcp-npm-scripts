# mcp-npm-scripts

Turn every npm script in your project's `package.json` into an MCP tool your AI assistant can invoke.

> Status: Functional but bare-bones (pre-1.0). Behavior & tool naming may still evolve—feedback welcome.

## Quickstart

1. Install (or skip and rely on npx each run)

```bash
npm i -D mcp-npm-scripts
```

2. Add to your .vscode/mcp.json (or create it if it doesn't exist)

```json
{
  "servers": {
    "npm-scripts": {
      "command": "npx",
      "args": ["mcp-npm-scripts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

3. Reload your MCP-enabled client (VS Code / other)
4. Ask the AI to run one of your scripts, e.g. "Run the test tool".

That's it—your npm scripts are now callable as tools! Depending on your IDE settings, you may still be prompted to allow the AI to call them the first time.

## What it does

`mcp-npm-scripts` is a lightweight Model Context Protocol server. Point it at (or let it auto-detect) a `package.json` and it registers one MCP tool per npm script. Calling a tool runs `npm run <original-script-name>` and returns the combined stdout + stderr as a text response to the client (e.g. VS Code / Claude Desktop / other MCP-enabled IDEs).

Use cases / benefits:

- Let an AI run lint, build, test, format, type-check tasks.
- Provide project-specific helper scripts (scaffolding, codegen) as safe, explicit tools instead of arbitrary shell access.
- Avoid granting blanket terminal command execution or dealing with a confirmation prompt for every arbitrary command: you approve the curated set of npm scripts once.
- Quickly expose repeatable workflows while keeping control in versioned scripts.

## How it works

1. Startup: The CLI locates a `package.json` (via explicit path argument or by walking upward from the current working directory, skipping its own dev package).
2. Discovery: Every entry under the `scripts` field is read
3. Tool naming: Each script name is sanitized to a valid MCP tool ID:
   - Lowercase
   - Replace any run of disallowed chars (`[^a-z0-9_-]`) with a single underscore
   - Trim leading/trailing underscores
   - If that yields a duplicate, append `_2`, `_3`, ...
4. Registration: A tool is registered with description `npm script: <command>` (or indicating original name if sanitizing changed it). The input schema accepts an optional `args` array.
5. Execution: When invoked, the server spawns `npm run <originalScriptName> [-- <args...>]` in the script's package directory, streaming stdout/stderr into one consolidated text result once the process exits.
6. Controlled surface (with caveat): Only declared npm scripts become tools—no arbitrary shell access is exposed directly. However, if the AI (or another user) can edit `package.json`, it could modify scripts to run arbitrary commands. Treat write access to `package.json` with the same trust level as giving broader shell execution.

No file watching yet—restart the server to pick up added/removed scripts (live refresh may come later).

### Output

Tool responses contain a single text part with merged stdout & stderr. If the script exits silently you still see npm's prelude lines (useful success signal). Exit codes are not yet surfaced separately—future versions may add a structured result.

## VS Code integration (MCP)

Basic setup is covered in Quickstart. For monorepos or explicit targeting you can supply a path arg (either the full path to a `package.json` or the path to a dir containing `package.json`):

```jsonc
{
  "servers": {
    "npm-scripts": {
      "command": "npx",
      "args": ["mcp-npm-scripts", "packages/app"],
      "cwd": "${workspaceFolder}",
    },
  },
}
```

Similar steps should work in other MCP-enabled IDEs.

### Monorepos

Right now only one `package.json` (the first found walking upward from the specified/working directory) is used. Point the server at a specific package's directory (or file) for per-package tools. Future enhancements may allow aggregating multiple packages.

## Security & caution

- Tools execute whatever the underlying npm scripts do—treat them with the same trust you already place in your scripts.
- Granting access to these tools is usually safer than granting a blanket "run arbitrary shell commands" permission and avoids repeated confirmations for each unrelated command.
- Environment variables from the parent process are inherited. Redact or sandbox as needed.
- Output may contain secrets your scripts print—avoid echoing sensitive data.
- If the AI can modify `package.json`, it can add a new script that runs arbitrary commands. Mitigations: code review / PR gating, read-only workspace mode, pre-commit hooks, or monitoring changes to `package.json`.

## Current limitations / planned improvements

- No live re-scan of scripts (restart to refresh).
- Exit code not yet exposed separately from text output.

## Contributing

Pull requests are very welcome—especially for items in the roadmap! If unsure, please open a brief issue or draft PR outlining your idea first.

### Dev Setup

```bash
npm install
npm run dev # watch rebuild
```

Run the dev server against some other project while iterating:

```bash
node dist/cli.js ../some-other-project
```

### Roadmap

Planned / open:

- Descriptions for each tool loaded from package.json
- Optional live script refresh (file watch & listChanged updates)
- Structured result including exit code & timing
- Multi-package (monorepo) aggregation mode

## License

MIT
