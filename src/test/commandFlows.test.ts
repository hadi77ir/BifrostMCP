import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { runTool } from '../toolRunner';

interface Cleanup {
    (): Promise<void> | void;
}

interface SpecContext {
    args: any;
    cleanup?: Cleanup;
}

suite('Command flows', () => {
    process.env.BIFROST_AUTO_APPROVE = '1';
    const repoRoot = vscode.Uri.file(path.resolve(__dirname, '..', '..'));
    const sampleWorkspaceUri = vscode.Uri.joinPath(repoRoot, 'sample-ts-workspace');
    const indexUri = vscode.Uri.joinPath(sampleWorkspaceUri, 'src/index.ts');
    let originalFolders: readonly vscode.WorkspaceFolder[] | undefined;

    const createTempFile = async (relPath: string, contents: string) => {
        const uri = vscode.Uri.joinPath(sampleWorkspaceUri, relPath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(contents, 'utf8'));
        return uri;
    };

    const deleteIfExists = async (uri: vscode.Uri) => {
        try {
            await vscode.workspace.fs.delete(uri, { recursive: false });
        } catch {
            // ignore
        }
    };

    suiteSetup(async () => {
        originalFolders = vscode.workspace.workspaceFolders;
        vscode.workspace.updateWorkspaceFolders(
            0,
            originalFolders?.length ?? 0,
            { uri: sampleWorkspaceUri }
        );
        await vscode.workspace.fs.stat(sampleWorkspaceUri);
        const doc = await vscode.workspace.openTextDocument(indexUri);
        await vscode.window.showTextDocument(doc);
        await vscode.tasks.fetchTasks(); // warm tasks/UI
        await vscode.extensions.getExtension('ConnorHallman.bifrost-mcp')?.activate();
    });

    test('run_terminal_command (echo)', async () => {
        const result = await runTool('run_terminal_command', { command: 'echo flow-test' });
        assert.deepStrictEqual(result, {
            output: 'flow-test',
            stderr: '',
            exitCode: 0,
            method: 'child_process'
        });
    }).timeout(20000);

    test('refactor inline variable on temp file', async () => {
        const uri = await createTempFile(
            'src/tmp-refactor-inline.ts',
            "function demo() {\n    const val = 1 + 2;\n    return val;\n}\n"
        );
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });
            await doc.save();
            await new Promise(resolve => setTimeout(resolve, 500));
            const line = doc.lineAt(1).text;
            const start = line.indexOf('1 + 2');
            const range = {
                start: { line: 1, character: start },
                end: { line: 1, character: start + '1 + 2'.length }
            };
            let actions: any[] = [];
            for (let attempt = 0; attempt < 4; attempt++) {
                actions = await runTool('list_refactor_actions', {
                    textDocument: { uri: uri.toString() },
                    position: { line: 1, character: start },
                    range
                }) as any[];
                if (actions.length) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            const inlineAction = actions.find(a => (a.kind ?? '').startsWith('refactor.extract'));
            const result = await runTool('run_refactor_action', {
                textDocument: { uri: uri.toString() },
                position: { line: 1, character: start },
                range,
                title: inlineAction?.title ?? 'Extract constant',
                kind: inlineAction?.kind ?? 'refactor.extract'
            }) as any;
            assert.ok(result.applied, 'Expected inline refactor to be applied');
            const updated = await vscode.workspace.openTextDocument(uri);
            const text = updated.getText();
            assert.ok(/const\s+\w+/.test(text), 'Expected extracted constant to be added');
            assert.ok(/return\s+\w+/.test(text), 'Return should use extracted constant');
        } finally {
            await deleteIfExists(uri);
        }
    }).timeout(20000);

    test('list_source_actions and run_source_action on unused import', async () => {
        const uri = await createTempFile(`src/tmp-source-actions-flow.ts`, 'import { greet } from "./index";\nconsole.log("hi");\n');
        const position = { line: 0, character: 5 };
        try {
            const listed = await runTool('list_source_actions', { textDocument: { uri: uri.toString() }, position });
            assert.ok(Array.isArray(listed), 'Expected source actions array');
            const organize = listed.find(a => a.title.toLowerCase().includes('organize imports') && a.kind === 'source.organizeImports');
            assert.ok(organize, 'Expected Organize imports action (manual or provider)');
            const run = await runTool('run_source_action', { textDocument: { uri: uri.toString() }, position, title: organize.title, kind: organize.kind });
            assert.deepStrictEqual(run, { applied: true, title: organize.title, kind: organize.kind });
        } finally {
            await deleteIfExists(uri);
        }
    }).timeout(20000);

    test('workspace and file diagnostics on error file', async () => {
        const uri = await createTempFile('src/tmp-diag-flow.ts', 'const broken = ;\n');
        try {
            await vscode.workspace.openTextDocument(uri);
            const collection = vscode.languages.createDiagnosticCollection('flow-test');
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(new vscode.Position(0, 6), new vscode.Position(0, 12)),
                'Manual diagnostic for testing',
                vscode.DiagnosticSeverity.Error
            );
            collection.set(uri, [diagnostic]);
            const fileDiag = await runTool('get_file_diagnostics', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(fileDiag?.hasIssues, 'Expected file diagnostics to report issues');
            assert.ok(
                fileDiag.diagnostics.some((d: any) => d.message === 'Manual diagnostic for testing'),
                'Expected injected diagnostic'
            );
            const wsDiag = await runTool('get_workspace_diagnostics', {}) as any[];
            const entry = wsDiag.find(d => d.uri === uri.toString());
            assert.ok(entry?.hasIssues, 'Workspace diagnostics should include the error file');
            collection.dispose();
        } finally {
            await deleteIfExists(uri);
        }
    }).timeout(20000);

    test('get_open_files with multiple editors', async () => {
        const doc1 = await vscode.workspace.openTextDocument(indexUri);
        const uri2 = await createTempFile('tmp-open-files.ts', 'const sample = 1;');
        const doc2 = await vscode.workspace.openTextDocument(uri2);
        await vscode.window.showTextDocument(doc1, { viewColumn: vscode.ViewColumn.One, preview: false });
        await vscode.window.showTextDocument(doc2, { viewColumn: vscode.ViewColumn.Two, preview: false });
        try {
            const result = await runTool('get_open_files', {});
            assert.ok(Array.isArray(result) && result.length >= 2, 'Expected two open files');
            const uris = result.map(r => r.uri);
            assert.ok(uris.includes(indexUri.toString()), 'Index file should be listed');
            assert.ok(uris.includes(uri2.toString()), 'Temp file should be listed');
        } finally {
            await deleteIfExists(uri2);
        }
    }).timeout(20000);

    test('cursor context / position / move_cursor with tag', async () => {
        const doc = await vscode.workspace.openTextDocument(indexUri);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const cursorPos = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(cursorPos, cursorPos);
        const context = await runTool('get_cursor_context', { textDocument: { uri: indexUri.toString() }, before: 1, after: 1 });
        assert.ok(context?.tag && context.content.includes(context.tag), 'Expected tag inside context');
        const moved = await runTool('move_cursor', { tag: context.tag });
        assert.ok(moved && moved.moved === true, 'Expected cursor to move via tag');
        const cursorInfo = await runTool('get_cursor_position', {});
        assert.strictEqual(cursorInfo.uri, context.uri);
        assert.deepStrictEqual(cursorInfo.position, { line: 0, character: 0 });
    }).timeout(20000);

    test('run configuration lifecycle', async () => {
        const name = `Flow Config ${Date.now()}`;
        const add = await runTool('add_run_configuration', { configuration: { name, type: 'node', request: 'launch', program: '${workspaceFolder}/index.js' } });
        const list1 = await runTool('list_run_configurations', {});
        const update = await runTool('update_run_configuration', { name, configuration: { program: '${workspaceFolder}/updated.js' } });
        const list2 = await runTool('list_run_configurations', {});
        const del = await runTool('delete_run_configuration', { name });
        const list3 = await runTool('list_run_configurations', {});
        const added = (list1 as any[]).find(cfg => cfg.name === name);
        assert.ok(add.added, 'Config should be added');
        assert.ok(added, 'Added configuration should be listed');
        const updatedCfg = (list2 as any[]).find(cfg => cfg.name === name);
        assert.strictEqual(updatedCfg?.program, '${workspaceFolder}/updated.js');
        assert.ok(del.deleted, 'Configuration should be deleted');
        const removed = (list3 as any[]).some(cfg => cfg.name === name);
        assert.strictEqual(removed, false, 'Configuration should be removed after delete');
    }).timeout(20000);

    test('build task lifecycle', async () => {
        const label = `flow-build-${Date.now()}`;
        const add = await runTool('add_build_task', { task: { label, type: 'shell', command: 'echo build-flow' } });
        const list1 = await runTool('list_build_tasks', {});
        const update = await runTool('update_build_task', { label, task: { command: 'echo build-flow-updated' } });
        const list2 = await runTool('list_build_tasks', {});
        const del = await runTool('remove_build_task', { label });
        const list3 = await runTool('list_build_tasks', {});
        assert.ok(add.added, 'Build task should be added');
        assert.ok((list1 as any[]).some(t => t.label === label && t.command === 'echo build-flow'), 'Added task should appear in list');
        assert.ok(update.updated, 'Build task should be updated');
        assert.ok((list2 as any[]).some(t => t.label === label && t.command === 'echo build-flow-updated'), 'Updated task should appear in list');
        assert.ok(del.removed, 'Build task should be removed');
        assert.strictEqual((list3 as any[]).some(t => t.label === label), false, 'Removed task should not remain');
    }).timeout(20000);

    test('move_file then delete_file', async () => {
        const src = await createTempFile('tmp-flow-src.txt', 'flow');
        const dest = vscode.Uri.joinPath(sampleWorkspaceUri, 'tmp-flow-dest.txt');
        try {
            const moveRes = await runTool('move_file', { source: src.toString(), destination: dest.toString() });
            assert.deepStrictEqual(moveRes, {
                moved: true,
                source: src.toString(),
                destination: dest.toString()
            });
            const delRes = await runTool('delete_file', { uri: dest.toString() });
            assert.deepStrictEqual(delRes, { deleted: true, uri: dest.toString() });
        } finally {
            await deleteIfExists(src);
            await deleteIfExists(dest);
        }
    }).timeout(20000);

    test('run_all_tests then get_last_test_results', async () => {
        const runAll = await runTool('run_all_tests', {});
        assert.deepStrictEqual(runAll, [
            { name: 'sample:lint', exitCode: 0 },
            { name: 'sample:test', exitCode: 0 },
            { name: 'test', exitCode: 0 }
        ]);
        const last = await runTool('get_last_test_results', {});
        assert.deepStrictEqual(last, [
            { name: 'sample:lint', exitCode: 0 },
            { name: 'sample:test', exitCode: 0 },
            { name: 'test', exitCode: 0 }
        ]);
    }).timeout(20000);

    test('run_vscode_command runs a VS Code command', async () => {
        const result = await runTool('run_vscode_command', {
            command: 'workbench.action.files.saveAll'
        });
        assert.deepStrictEqual(result, { executed: true, result: null });
    }).timeout(10000);
});
