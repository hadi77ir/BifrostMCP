## Command integrations (implemented)

Commands added (inspired by Cline services):

- `run_terminal_command`: Executes shell commands via VS Code shell integration when available, falling back to a child process; returns output, stderr, and exit code.
- `search_regex`: Regex search across workspace or folder with context and capped results.
- `list_files`: Workspace file listing with common ignores and limit.
- `summarize_definitions`: Document symbol summaries as lightweight definition listings.

Implementation snapshot:

- Schemas live in `src/tools.ts`.
- Helpers in `src/commandTools.ts`.
- Tool wiring in `src/toolRunner.ts`.
- Tests in `src/test/newTools.test.ts` (plus formatter tests in `src/test/formatTools.test.ts`).

Manual test ideas:
- Run `run_terminal_command` with `echo test` and a failing command to inspect exit codes/stderr.
- Run `search_regex` with a scoped folder and verify context lines.
- Run `list_files` with different limits to ensure ignores are respected.
- Run `summarize_definitions` on a file with multiple symbols and confirm names/kinds.
