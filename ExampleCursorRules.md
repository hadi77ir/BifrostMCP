# Example Cursor Rules and Bifrost Tooling

Practical guidance for using Bifrost tools the way we typically do during edits.

## Goals
- Keep tool calls small and purposeful; gather only the context you need.
- Use semantic queries when they add value; avoid over-querying the workspace.
- Favor readable diffs for hand edits; use commands/tasks for generated output.

## Core Patterns (with sample calls)
- File context: `mcp__Bifrost__read_file_safe({"textDocument":{"uri":"/repo/path/file.ts"}})` or `mcp__Bifrost__read_range` for big files.
- Structure: `mcp__Bifrost__get_document_symbols({"textDocument":{"uri":"/repo/path/file.ts"}})` to see the outline before diving in.
- Navigation: `mcp__Bifrost__move_cursor({"textDocument":{"uri":"/repo/path/file.ts"},"searchString":"functionName"})` to jump to a spot; use `get_cursor_context` tags to return later.
- Symbol inspection: `mcp__Bifrost__get_hover_info` to confirm signatures, `mcp__Bifrost__go_to_definition` for sources, `mcp__Bifrost__get_type_definition` for underlying types.
- Impact checks: `mcp__Bifrost__find_usages` when changing an API, `mcp__Bifrost__find_implementations` for interfaces/abstracts, `mcp__Bifrost__get_call_hierarchy` for call chains.
- Editing: prefer patching for single-file manual changes; avoid it for auto-generated output.
- Validation: `mcp__Bifrost__get_file_diagnostics` (or `get_workspace_diagnostics`) after edits; run relevant tests with `mcp__Bifrost__run_test`/`run_all_tests` when available.

## Example Flows
- Small fix:
```
await mcp__Bifrost__read_range({textDocument:{uri:"/repo/file.ts"},range:{start:{line:20,character:0},end:{line:80,character:0}}})
await mcp__Bifrost__get_hover_info({textDocument:{uri:"/repo/file.ts"},position:{line:42,character:5}}) // confirm signature
// edit with apply_patch
await mcp__Bifrost__get_file_diagnostics({textDocument:{uri:"/repo/file.ts"}})
```

- Changing a function with callers:
```
await mcp__Bifrost__find_usages({textDocument:{uri:"/repo/file.ts"},position:{line:55,character:10}})
await mcp__Bifrost__get_call_hierarchy({textDocument:{uri:"/repo/file.ts"},position:{line:55,character:10}}) // spot upstream/downstream impact
// update callers surfaced by usages/hierarchy
await mcp__Bifrost__get_hover_info({textDocument:{uri:"/repo/file.ts"},position:{line:55,character:10}}) // re-check types
```

- Modifying a type or interface:
```
await mcp__Bifrost__get_type_definition({textDocument:{uri:"/repo/types.ts"},position:{line:12,character:6}})
await mcp__Bifrost__find_implementations({textDocument:{uri:"/repo/types.ts"},position:{line:12,character:6}})
// adjust each implementation as needed
```

## Best Practices
- Start with structure, then zoom in: `get_document_symbols` -> targeted `read_range`.
- Use `move_cursor` with search strings or tags to keep context stable between edits.
- Keep commands scoped; avoid fetching entire files if a range suffices.
- Mention which tools informed your decisions when summarizing work.
- Do not revert existing user changes; limit edits to what you intend to modify.
- For large files, chain small `read_range` calls instead of dumping everything.
- If a command fails or seems heavy, try a narrower query before retrying.
- Run diagnostics or tests after behavior-changing edits and note any gaps if you cannot run them.
