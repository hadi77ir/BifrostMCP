# Sample TypeScript Workspace

Minimal TypeScript project for testing MCP tools or extension workflows.

## Setup

```bash
cd sample-ts-workspace
npm install
```

## Run checks

```bash
npm test   # aliases to tsc --noEmit
```

## Notes
- `src/index.ts` exports a couple of tiny functions (`greet`, `average`) you can import or call while testing.
- The project is strict-mode enabled and uses `noEmit` so it is safe to run repeatedly.
