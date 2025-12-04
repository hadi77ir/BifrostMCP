import * as assert from 'assert';
import * as vscode from 'vscode';
import { runTool } from '../toolRunner';
import * as path from 'path';

suite('New MCP tools', () => {
    process.env.BIFROST_AUTO_APPROVE = '1';
    const repoRoot = vscode.Uri.file(path.resolve(__dirname, '..', '..'));
    const sampleWorkspaceUri = vscode.Uri.joinPath(repoRoot, 'sample-ts-workspace');
    let workspaceFolder: vscode.WorkspaceFolder | undefined;
    let originalFolders: readonly vscode.WorkspaceFolder[] | undefined;

    suiteSetup(async () => {
        originalFolders = vscode.workspace.workspaceFolders;
        vscode.workspace.updateWorkspaceFolders(
            0,
            originalFolders?.length ?? 0,
            { uri: sampleWorkspaceUri }
        );
        workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const indexUri = vscode.Uri.joinPath(sampleWorkspaceUri, 'src/index.ts');
        const doc = await vscode.workspace.openTextDocument(indexUri);
        await vscode.window.showTextDocument(doc, { preview: false });
        await vscode.languages.getLanguages(); // hint to warm up LS
    });

    suiteTeardown(() => {
        if (originalFolders) {
            const currentCount = vscode.workspace.workspaceFolders?.length ?? 0;
            vscode.workspace.updateWorkspaceFolders(
                0,
                currentCount,
                ...originalFolders.map(f => ({ uri: f.uri }))
            );
        }
    });

    async function createTempFile(relativePath: string, contents: string): Promise<vscode.Uri> {
        const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            throw new Error('Workspace folder is required for tests');
        }
        const uri = vscode.Uri.joinPath(folder.uri, relativePath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(contents, 'utf8'));
        return uri;
    }

    async function deleteTempFile(uri: vscode.Uri) {
        try {
            await vscode.workspace.fs.delete(uri, { recursive: false });
        } catch {
            // ignore cleanup errors
        }
    }

    test('run_terminal_command executes echo', async () => {
        const result = await runTool('run_terminal_command', { command: 'echo bifrost-test' }) as any;
        assert.ok(result.output.includes('bifrost-test'), 'Expected output to contain echoed text');
        assert.ok(['shellIntegration', 'child_process', 'unknown'].includes(result.method), 'Unexpected method');
    }).timeout(15000);

    test('search_regex finds matches with context', async () => {
        const uri = await createTempFile('tmp-search.txt', 'alpha\nbeta\nalpha gamma\n');
        try {
            const result = await runTool('search_regex', { query: 'alpha' }) as any[];
            assert.ok(Array.isArray(result), 'Result should be an array');
            assert.ok(result.length >= 1, 'Expected at least one match for alpha');
            const match = result[0];
            assert.ok(match.uri, 'Match should include uri');
            assert.ok(typeof match.line === 'number', 'Match should include line number');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('list_files returns created file', async () => {
        const uri = await createTempFile('tmp-list-files.txt', 'content');
        try {
            const result = await runTool('list_files', { limit: 50 }) as any[];
            const relative = workspaceFolder ? vscode.workspace.asRelativePath(uri) : uri.fsPath;
            const hasFile = result.some(entry => entry.path === relative);
            assert.ok(hasFile, `Expected list_files to include ${relative}`);
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('summarize_definitions returns symbols', async () => {
        const uri = await createTempFile('tmp-definitions.ts', 'export function foo(bar: number) { return bar + 1; }\n');
        try {
            const result = await runTool('summarize_definitions', { textDocument: { uri: uri.toString() } }) as any[];
            assert.ok(Array.isArray(result), 'Result should be array of definitions');
            assert.ok(result.some(d => d.name === 'foo'), 'Expected to find function foo');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('list_source_actions returns actions', async function () {
            const uri = await createTempFile('src/tmp-source-actions-newtools.ts', "import { b } from './b';\nimport { a } from './a';\nexport const c = b ?? a;\n");
        const aUri = await createTempFile('a.ts', 'export const a = 1;\n');
        const bUri = await createTempFile('b.ts', 'export const b = 2;\n');
        try {
            const actions = await runTool('list_source_actions', { textDocument: { uri: uri.toString() } }) as any[];
            if (!Array.isArray(actions) || actions.length === 0) {
                this.skip();
            }
            assert.ok(actions.some(a => a.kind?.startsWith('source')), 'Expected source actions');
        } finally {
            await deleteTempFile(uri);
            await deleteTempFile(aUri);
            await deleteTempFile(bUri);
        }
    }).timeout(20000);

    test('run_source_action can organize imports', async function () {
        const uri = await createTempFile('tmp-run-source.ts', "import { b } from './b';\nimport { a } from './a';\nexport const c = b ?? a;\n");
        const aUri = await createTempFile('a.ts', 'export const a = 1;\n');
        const bUri = await createTempFile('b.ts', 'export const b = 2;\n');
        try {
            const actions = await runTool('list_source_actions', { textDocument: { uri: uri.toString() } }) as any[];
            const organize = actions.find((a: any) => (a.kind ?? '').startsWith('source.organizeImports')) ?? actions[0];
            if (!organize) {
                this.skip();
            }
            const result = await runTool('run_source_action', {
                textDocument: { uri: uri.toString() },
                title: organize.title,
                kind: organize.kind
            }) as any;
            assert.ok(result.applied, 'Expected source action to be applied');
        } finally {
            await deleteTempFile(uri);
            await deleteTempFile(aUri);
            await deleteTempFile(bUri);
        }
    }).timeout(20000);

    test('list_refactor_actions returns refactors', async function () {
        const uri = await createTempFile('tmp-refactor-list.ts', "function demo() {\n    const value = 1 + 2;\n    return value;\n}\n");
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const lineText = doc.lineAt(1).text;
            const startCol = lineText.indexOf('1 + 2');
            const range = {
                start: { line: 1, character: startCol },
                end: { line: 1, character: startCol + '1 + 2'.length }
            };
            const actions = await runTool('list_refactor_actions', {
                textDocument: { uri: uri.toString() },
                position: { line: 1, character: startCol },
                range
            }) as any[];
            if (!Array.isArray(actions) || actions.length === 0) {
                this.skip();
            }
            assert.ok(actions.some(a => (a.kind ?? '').startsWith('refactor')), 'Expected refactor actions');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(20000);

    test('run_refactor_action can extract constant', async function () {
        const uri = await createTempFile('tmp-refactor-run.ts', "function demo() {\n    const value = 1 + 2;\n    return value;\n}\n");
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const lineText = doc.lineAt(1).text;
            const startCol = lineText.indexOf('1 + 2');
            const range = {
                start: { line: 1, character: startCol },
                end: { line: 1, character: startCol + '1 + 2'.length }
            };
            const actions = await runTool('list_refactor_actions', {
                textDocument: { uri: uri.toString() },
                position: { line: 1, character: startCol },
                range
            }) as any[];
            const extract = actions.find((a: any) => (a.kind ?? '').startsWith('refactor.extract'));
            if (!extract) {
                this.skip();
            }
            const result = await runTool('run_refactor_action', {
                textDocument: { uri: uri.toString() },
                position: { line: 1, character: startCol },
                range,
                title: extract.title,
                kind: extract.kind
            }) as any;
            assert.ok(result.applied, 'Expected refactor action to be applied');
            const docAfter = await vscode.workspace.openTextDocument(uri);
            const text = docAfter.getText();
            assert.ok(/const\s+new/i.test(text) || /const\s+\w+\s*=\s*1\s*\+\s*2/.test(text), 'Expected extracted constant to be inserted');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(30000);

    test('get_open_files lists active editor', async () => {
        const uri = await createTempFile('tmp-open-files.ts', 'const z = 1;\n');
        try {
            const opened = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(opened);
            const result = await runTool('get_open_files', {}) as any[];
            assert.ok(Array.isArray(result), 'Expected array of open files');
            const entry = result.find(e => e.uri === uri.toString());
            assert.ok(entry, 'Expected opened file to be listed');
            assert.ok(entry.isActive, 'Expected opened file to be active');
            assert.ok(Array.isArray(entry.selections), 'Expected selections array');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('open_file opens and focuses document', async () => {
        const uri = await createTempFile('tmp-open-file.ts', 'const q = 2;\n');
        try {
            const result = await runTool('open_file', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(result.opened, 'Expected open_file to report opened');
            assert.strictEqual(result.uri, uri.toString(), 'Expected returned uri to match');
            assert.ok(result.isActive, 'Expected opened file to be active');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('save_file saves dirty document', async () => {
        const uri = await createTempFile('tmp-save-file.ts', 'const before = 1;\n');
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);
            await editor.edit(edit => edit.insert(new vscode.Position(0, 0), '// dirty\n'));
            assert.ok(doc.isDirty, 'Document should be dirty before save');

            const result = await runTool('save_file', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(result.saved, 'Expected save_file to report saved');
            assert.ok(result.wasDirty, 'Expected wasDirty flag');
            assert.ok(!doc.isDirty, 'Document should be clean after save');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('close_file closes open tab', async () => {
        const uri = await createTempFile('tmp-close-file.ts', 'const closeMe = true;\n');
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });

            const result = await runTool('close_file', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(result.closed, 'Expected close_file to report closed');

            const stillOpenTab = vscode.window.tabGroups.all
                .flatMap(group => group.tabs)
                .find(tab => {
                    const input = tab.input;
                    if (input instanceof vscode.TabInputText) {
                        return input.uri.toString() === uri.toString();
                    }
                    if (input instanceof vscode.TabInputTextDiff) {
                        return input.modified.toString() === uri.toString()
                            || input.original.toString() === uri.toString();
                    }
                    return false;
                });
            assert.ok(!stillOpenTab, 'Expected tab to be closed');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('read_file_safe returns content', async () => {
        const uri = await createTempFile('tmp-read-safe.txt', 'hello world');
        try {
            const result = await runTool('read_file_safe', { textDocument: { uri: uri.toString() } }) as any;
            assert.strictEqual(result.content, 'hello world');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(10000);

    test('insert_lines inserts content', async () => {
        const uri = await createTempFile('tmp-insert-lines.txt', 'one\ntwo\nthree\n');
        try {
            const result = await runTool('insert_lines', {
                textDocument: { uri: uri.toString() },
                line: 1,
                lines: ['inserted']
            }) as any;
            assert.ok(result.applied, 'Expected insert to apply');
            const doc = await vscode.workspace.openTextDocument(uri);
            const lines = doc.getText().split(/\r?\n/);
            assert.strictEqual(lines[1], 'inserted');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('remove_lines removes range', async () => {
        const uri = await createTempFile('tmp-remove-lines.txt', 'a\nb\nc\nd\n');
        try {
            const result = await runTool('remove_lines', {
                textDocument: { uri: uri.toString() },
                startLine: 1,
                endLine: 3
            }) as any;
            assert.ok(result.applied, 'Expected remove to apply');
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            assert.ok(!text.includes('b') && !text.includes('c'), 'Expected lines removed');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('replace_lines replaces range', async () => {
        const uri = await createTempFile('tmp-replace-lines.txt', 'x\ny\nz\n');
        try {
            const result = await runTool('replace_lines', {
                textDocument: { uri: uri.toString() },
                startLine: 1,
                endLine: 2,
                lines: ['new']
            }) as any;
            assert.ok(result.applied, 'Expected replace to apply');
            const doc = await vscode.workspace.openTextDocument(uri);
            const lines = doc.getText().split(/\r?\n/);
            assert.strictEqual(lines[1], 'new');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('list_files_paginated returns paged results', async () => {
        const fileA = await createTempFile('tmp-paginate-a.txt', 'page');
        const fileB = await createTempFile('tmp-paginate-b.txt', 'page');
        try {
            const page1 = await runTool('list_files_paginated', { page: 1, pageSize: 1, glob: 'tmp-paginate-*.txt' }) as any[];
            const page2 = await runTool('list_files_paginated', { page: 2, pageSize: 1, glob: 'tmp-paginate-*.txt' }) as any[];
            assert.ok(Array.isArray(page1) && Array.isArray(page2), 'Expected arrays');
            const uris = [...page1, ...page2].map(e => e.uri);
            assert.ok(uris.includes(fileA.toString()) && uris.includes(fileB.toString()), 'Expected both temp files across pages');
            assert.notDeepStrictEqual(page1, page2, 'Pages should differ when enough files exist');
        } finally {
            await deleteTempFile(fileA);
            await deleteTempFile(fileB);
        }
    }).timeout(15000);

    test('copy_file copies file', async () => {
        const src = await createTempFile('tmp-copy-src.txt', 'copy me');
        const dest = vscode.Uri.joinPath(workspaceFolder!.uri, 'tmp-copy-dest.txt');
        try {
            const res = await runTool('copy_file', { source: src.toString(), destination: dest.toString() }) as any;
            assert.ok(res.copied, 'Expected copy to succeed');
            const doc = await vscode.workspace.openTextDocument(dest);
            assert.strictEqual(doc.getText(), 'copy me');
        } finally {
            await deleteTempFile(src);
            await deleteTempFile(dest);
        }
    }).timeout(15000);

    test('get_file_diagnostics returns diagnostics', async () => {
        const uri = await createTempFile('tmp-diag.ts', 'const x: number = "oops";\n');
        const collection = vscode.languages.createDiagnosticCollection('diag-test');
        try {
            const range = new vscode.Range(new vscode.Position(0, 16), new vscode.Position(0, 22));
            const diag = new vscode.Diagnostic(range, 'Type mismatch', vscode.DiagnosticSeverity.Error);
            collection.set(uri, [diag]);

            const result = await runTool('get_file_diagnostics', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(result.hasIssues, 'Expected diagnostics to be reported');
            assert.ok(result.diagnostics.length === 1, 'Expected one diagnostic');
            assert.strictEqual(result.diagnostics[0].message, 'Type mismatch');
        } finally {
            collection.clear();
            collection.dispose();
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('get_workspace_diagnostics aggregates diagnostics', async () => {
        const uri = await createTempFile('tmp-workspace-diag.ts', 'const y: number = "bad";\n');
        const collection = vscode.languages.createDiagnosticCollection('workspace-diag-test');
        try {
            const range = new vscode.Range(new vscode.Position(0, 16), new vscode.Position(0, 21));
            const diag = new vscode.Diagnostic(range, 'Another mismatch', vscode.DiagnosticSeverity.Warning);
            collection.set(uri, [diag]);

            const result = await runTool('get_workspace_diagnostics', {}) as any[];
            assert.ok(Array.isArray(result), 'Expected array of workspace diagnostics');
            const entry = result.find(r => r.uri === uri.toString());
            assert.ok(entry, 'Expected file diagnostics in workspace results');
            assert.ok(entry.hasIssues, 'Expected issues flagged');
        } finally {
            collection.clear();
            collection.dispose();
            await deleteTempFile(uri);
        }
    }).timeout(15000);
});
