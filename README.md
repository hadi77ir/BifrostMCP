# Bifrost - VSCode Dev Tools MCP Server
<a href="https://marketplace.visualstudio.com/items?itemName=ConnorHallman.bifrost-mcp">
  <img src="https://img.shields.io/visual-studio-marketplace/d/ConnorHallman.bifrost-mcp?label=VSCode%20Extension%20Downloads&cacheSeconds=3600" 
       alt="VSCode Extension Downloads" 
       width="250">
</a>

This VS Code extension provides a Model Context Protocol (MCP) server that exposes VSCode's powerful development tools and language features to AI tools. It enables advanced code navigation, analysis, and manipulation capabilities when using AI coding assistants that support the MCP protocol.

![image](https://raw.githubusercontent.com/biegehydra/BifrostMCP/refs/heads/master/src/images/cursor.png)

## Table of Contents
- [Features](#features)
- [Installation/Usage](#usage)
- [MCP Protocol Support](#mcp-protocol-support)
- [Multi-Project Support](#multiple-project-support)
- [Available Tools](#available-tools)
- [Available Commands](#available-commands)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Debugging](#debugging)
- [License](#license)

## Features

- **Language Server Integration**: Access VSCode's language server capabilities for any supported language
- **Code Navigation**: Find references, definitions, implementations, and more
- **Symbol Search**: Search for symbols across your workspace
- **Code Analysis**: Get semantic tokens, document symbols, and type information
- **Smart Selection**: Use semantic selection ranges for intelligent code selection
- **Code Actions**: Access refactoring suggestions and quick fixes
- **HTTP/SSE Server**: Exposes language features over an MCP-compatible HTTP server
- **AI Assistant Integration**: Ready to work with AI assistants that support the MCP protocol

## Usage

### Installation

1. Install [the extension](https://marketplace.visualstudio.com/items?itemName=ConnorHallman.bifrost-mcp) from the VS Code marketplace
2. Install any language-specific extensions you need for your development
3. Open your project in VS Code

### Configuration

The extension will automatically start an MCP server when activated. To configure an AI assistant to use this server:

1. The server runs on port 8008 by default (configurable with `bifrost.config.json`)
2. Preferred (Streamable HTTP, MCP protocol 2025-03-26):
   - Base endpoint: `http://localhost:8008/mcp`
   - Initialize with POST, stream with GET (text/event-stream), send follow-up POSTs, end session with DELETE.
3. Legacy (SSE, MCP protocol 2024-11-05):
   - SSE stream: `http://localhost:8008/sse`
   - Message endpoint: `http://localhost:8008/message?sessionId=<id>`

### MCP Protocol Support
- **Streamable HTTP (recommended)**: Full MCP 2025-03-26 support with resumable streaming and JSON responses; use the `/mcp` endpoint.
- **Legacy SSE**: Maintained for older clients; use `/sse` and `/message?sessionId=<id>`.

### LLM Rules
I have also provided sample rules that can be used in .cursorrules files for better results.

[Example Cursor Rules](https://github.com/biegehydra/BifrostMCP/blob/master/ExampleCursorRules.md)

[Example MDC Rules](https://github.com/biegehydra/BifrostMCP/blob/master/example.mdc)

### Cline Installation
- Step 1. Install [Supergateway](https://github.com/supercorp-ai/supergateway)
- Step 2. Add config to cline
- Step 3. It will show up red but seems to work fine

#### Windows Config
```json
{
  "mcpServers": {
    "Bifrost": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "supergateway",
        "--sse",
        "http://localhost:8008/sse"
      ],
      "disabled": false,
      "autoApprove": [],
      "timeout": 600
    }
  }
}
```

#### Mac/Linux Config
```json
{
  "mcpServers": {
    "Bifrost": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "http://localhost:8008/sse"
      ],
      "disabled": false,
      "autoApprove": [],
      "timeout": 600
    }
  }
}
```

### Roo Code Installation
- Step 1: Add the SSE config to your global or project-based MCP configuration
```json
{
  "mcpServers": {
    "Bifrost": {
      "url": "http://localhost:8008/sse"
    }
  }
}
```

#### Cursor Installation
```json
{
  "mcpServers": {
    "Bifrost": {
      "url": "http://localhost:8008/mcp"
    }
  }
}
```

### Codex CLI / Codex VS Code Extension
First, install mcp-proxy:
```
uv tool install mcp-proxy
```

Then in `~/.codex/config.toml` add this section:
```
[mcp_servers.Bifrost]
command = "mcp-proxy"
args = ["--transport", "streamablehttp", "http://localhost:8008/mcp"]
```

## Multiple Project Support

When working with multiple projects, each project can have its own dedicated MCP server endpoint and port. This is useful when you have multiple VS Code windows open or are working with multiple projects that need language server capabilities.

### Project Configuration

Create a `bifrost.config.json` file in your project root:

```json
{
    "projectName": "MyProject",
    "description": "Description of your project",
    "path": "/my-project",
    "port": 5642
}
```

The server will use this configuration to:
- Create project-specific endpoints (e.g., `http://localhost:5642/my-project/mcp` for Streamable HTTP, `.../sse` for legacy)
- Provide project information to AI assistants
- Use a dedicated port for each project
- Isolate project services from other running instances

### Example Configurations

1. Backend API Project:
```json
{
    "projectName": "BackendAPI",
    "description": "Node.js REST API with TypeScript",
    "path": "/backend-api",
    "port": 5643
}
```

2. Frontend Web App:
```json
{
    "projectName": "FrontendApp",
    "description": "React frontend application",
    "path": "/frontend-app",
    "port": 5644
}
```

### Port Configuration

Each project should specify its own unique port to avoid conflicts when multiple VS Code instances are running:

- The `port` field in `bifrost.config.json` determines which port the server will use
- If no port is specified, it defaults to 8008 for backwards compatibility
- Choose different ports for different projects to ensure they can run simultaneously
- The server will fail to start if the configured port is already in use, requiring you to either:
  - Free up the port
  - Change the port in the config
  - Close the other VS Code instance using that port

### Connecting to Project-Specific Endpoints

Update your AI assistant configuration to use the project-specific endpoint and port:

```json
{
  "mcpServers": {
    "BackendAPI": {
      "url": "http://localhost:5643/backend-api/mcp"
    },
    "FrontendApp": {
      "url": "http://localhost:5644/frontend-app/mcp"
    }
  }
}
```

### Backwards Compatibility

If no `bifrost.config.json` is present, the server will use the default configuration:
- Port: 8008
- Streamable HTTP endpoint: `http://localhost:8008/mcp` (preferred)
- SSE endpoint: `http://localhost:8008/sse`
- Message endpoint: `http://localhost:8008/message`

This maintains compatibility with existing configurations and tools.

## Available Tools

The MCP server exposes 83 tools:

- **find_usages** — Find all references to a symbol
- **go_to_definition** — Find definition of a symbol
- **find_implementations** — Find implementations of interface/abstract method
- **get_hover_info** — Get hover information for a symbol
- **get_document_symbols** — Get all symbols in document
- **get_completions** — Get code completion suggestions at a position
- **get_signature_help** — Get function signature information
- **get_rename_locations** — Get all locations that would be affected by renaming a symbol
- **rename** — Rename a symbol
- **get_code_actions** — Get available code actions and refactorings
- **get_semantic_tokens** — Get semantic token information for code understanding
- **get_call_hierarchy** — Get incoming and outgoing call hierarchy
- **get_type_hierarchy** — Get type hierarchy information
- **get_code_lens** — Get CodeLens items inline with actionable info
- **get_selection_range** — Get selection ranges for smart selection expansion
- **get_type_definition** — Find type definitions of symbols
- **get_declaration** — Find declarations of symbols
- **get_document_highlights** — Find all highlights of a symbol in document
- **get_workspace_symbols** — Search for symbols across the workspace
- **list_formatters** — List available formatters for a document
- **format_document** — Format a document using the default or a chosen formatter
- **run_terminal_command** — Execute a shell command and capture output
- **run_vscode_command** — Execute a VS Code command (requires approval)
- **search_regex** — Regex search with context across the workspace
- **list_files** — List workspace files (common ignores applied)
- **summarize_definitions** — Summarize document definitions via document symbols
- **list_source_actions** — List available source actions for a document/range
- **run_source_action** — Execute a chosen source action
- **list_refactor_actions** — List available refactor actions at a position
- **run_refactor_action** — Execute a chosen refactor action on current symbol
- **get_workspace_diagnostics** — Get diagnostic information for the workspace
- **get_file_diagnostics** — Get diagnostic information for a specific file
- **get_open_files** — List currently open editors and selections
- **get_selected_code** — Return selections and their text from visible editors
- **open_file** — Open a file and make it the active editor tab
- **save_file** — Save an opened file if it is dirty
- **close_file** — Close an opened file tab
- **get_cursor_context** — Capture tagged context around the current cursor
- **move_cursor** — Move the cursor to a position or text match in a file
- **get_cursor_position** — Report the active cursor line/character
- **read_file_safe** — Safely read file contents from the workspace
- **read_range** — Read a specific line/character range from a file
- **apply_patch_review** — Queue a unified diff patch with review controls
- **insert_lines** — Insert lines into a file at a specific line number
- **remove_lines** — Remove a range of lines from a file
- **replace_lines** — Replace a range of lines with new content
- **list_files_paginated** — List workspace files with pagination and optional glob
- **get_workspace_tree** — Return a shallow tree view of the workspace
- **copy_file** — Copy a file within the workspace
- **move_file** — Move or rename a file within the workspace
- **delete_file** — Delete a file in the workspace
- **prompt_user_choice** — Ask the user a question with multiple choices
- **list_tests** — List available test tasks in the workspace
- **run_test** — Run a selected test task
- **run_all_tests** — Run all test tasks in the workspace
- **get_last_test_results** — Return the most recent test task results
- **list_run_configurations** — List run/debug configurations from launch.json
- **add_run_configuration** — Add a launch configuration
- **update_run_configuration** — Update an existing launch configuration
- **delete_run_configuration** — Delete a launch configuration by name
- **start_debug_configuration** — Start a launch configuration with debugging
- **start_no_debug_configuration** — Run a launch configuration without debugging
- **list_build_tasks** — List build tasks from tasks.json
- **add_build_task** — Add a build task to tasks.json
- **update_build_task** — Update fields of a build task
- **remove_build_task** — Remove a build task by label
- **run_build_task** — Run a build task by label
- **debug_status** — Report whether a debug session is active
- **debug_stop** — Stop the active debug session
- **debug_step_over** — Step over the next statement while debugging
- **debug_step_into** — Step into the next function call
- **debug_step_out** — Step out to the caller frame
- **debug_continue** — Resume debugger execution
- **debug_add_watch** — Add an expression to the debugger watch list
- **debug_list_watches** — List all watched expressions
- **debug_remove_watch** — Remove a watched expression
- **debug_watch_values** — Evaluate watched expressions in the current frame
- **debug_get_locals** — Inspect locals from the active debug frame
- **debug_get_call_stack** — Show the current debug call stack
- **debug_add_breakpoint** — Add a function or source breakpoint
- **debug_remove_breakpoint** — Remove a function or line breakpoint
- **debug_disable_all_breakpoints** — Disable all breakpoints without deleting them
- **debug_remove_all_breakpoints** — Remove all breakpoints completely

## Requirements

- Visual Studio Code version 1.93.0 or higher
- Appropriate language extensions for the languages you want to work with (e.g., C# extension for C# files)

### Available Commands

- `Bifrost MCP: Start Server` - Start the MCP server with the current config (defaults to port 8008).
- `Bifrost MCP: Start Server on Port` - Start the MCP server on a port you specify.
- `Bifrost MCP: Stop Server` - Stop the running MCP server.
- `Bifrost MCP: Open Debug Panel` - Open an in-editor panel to invoke and debug tools.

![image](https://raw.githubusercontent.com/biegehydra/BifrostMCP/refs/heads/master/src/images/commands.png)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=biegehydra/BifrostMCP&type=Date)](https://star-history.com/#biegehydra/BifrostMCP&Date)

## Example Tool Usage

### Find References
```json
{
  "name": "find_usages",
  "arguments": {
    "textDocument": {
      "uri": "file:///path/to/your/file"
    },
    "position": {
      "line": 10,
      "character": 15
    },
    "context": {
      "includeDeclaration": true
    }
  }
}
```

### Workspace Symbol Search
```json
{
  "name": "get_workspace_symbols",
  "arguments": {
    "query": "MyClass"
  }
}
```

## Troubleshooting

If you encounter issues:

1. Ensure you have the appropriate language extensions installed for your project
2. Check that your project has loaded correctly in VSCode
3. Verify that port 8008 is available on your system
4. Check the VSCode output panel for any error messages

## Contributing
Here are [Vscodes commands](https://github.com/microsoft/vscode-docs/blob/main/api/references/commands.md?plain=1) if you want to add additional functionality go ahead. I think we still need rename and a few others.
Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/biegehydra/csharplangmcpserver).

`vsce package`

## Debugging
Use the `MCP: Open Debug Panel` command
![image](https://raw.githubusercontent.com/biegehydra/BifrostMCP/refs/heads/master/src/images/debug_panel.png)

## License

This extension is licensed under the APGL-3.0 License.
