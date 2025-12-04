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

const logResult = (name: string, result: any) => {
    // eslint-disable-next-line no-console
    console.log(`[flow][${name}]`, JSON.stringify(result, null, 2));
};

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
    });

    suiteTeardown(() => {
        if (originalFolders) {
            const currentCount = vscode.workspace.workspaceFolders?.length ?? 0;
            vscode.workspace.updateWorkspaceFolders(
                0,
                currentCount,
                ...originalFolders.map(folder => ({ uri: folder.uri }))
            );
        }
    });

    test('run_terminal_command (echo)', async () => {
        const result = await runTool('run_terminal_command', { command: 'echo flow-test' });
        logResult('run_terminal_command', result);
        assert.ok(result && typeof result.output === 'string', 'Expected output string');
        assert.ok(result.output.includes('flow-test'));
    }).timeout(20000);

    test('refactor inline variable on temp file', async () => {
        const uri = await createTempFile('tmp-refactor-inline.ts', 'function demo() { const val = 1 + 2; return val; }');
        const position = { line: 0, character: 27 }; // on val
        const result = await runTool('run_refactor_action', {
            textDocument: { uri: uri.toString() },
            position,
            title: 'Inline variable',
            kind: 'refactor.inline'
        });
        logResult('run_refactor_action', result);
        assert.ok(result !== undefined, 'Expected refactor result (may be empty if provider missing)');
        await deleteIfExists(uri);
    }).timeout(20000);

    test('list_source_actions and run_source_action on unused import', async () => {
        const uri = await createTempFile('tmp-source-actions.ts', 'import { greet } from "./index";\nconsole.log("hi");\n');
        const position = { line: 0, character: 5 };
        const listed = await runTool('list_source_actions', { textDocument: { uri: uri.toString() }, position });
        logResult('list_source_actions', listed);
        assert.ok(Array.isArray(listed), 'Expected source actions array');
        const run = await runTool('run_source_action', { textDocument: { uri: uri.toString() }, position, title: 'Organize Imports', kind: 'source.organizeImports' });
        logResult('run_source_action', run);
        assert.ok(run !== undefined, 'Expected run_source_action result');
        await deleteIfExists(uri);
    }).timeout(20000);

    test('workspace and file diagnostics on error file', async () => {
        const uri = await createTempFile('tmp-diag-flow.ts', 'const x: string = 1;\n');
        const fileDiag = await runTool('get_file_diagnostics', { textDocument: { uri: uri.toString() } });
        logResult('get_file_diagnostics', fileDiag);
        assert.ok(fileDiag && fileDiag.hasIssues !== undefined);
        const wsDiag = await runTool('get_workspace_diagnostics', {});
        logResult('get_workspace_diagnostics', wsDiag);
        assert.ok(Array.isArray(wsDiag), 'Expected workspace diagnostics array');
        await deleteIfExists(uri);
    }).timeout(20000);

    test('get_open_files with multiple editors', async () => {
        const doc1 = await vscode.workspace.openTextDocument(indexUri);
        const uri2 = await createTempFile('tmp-open-files.ts', 'const sample = 1;');
        const doc2 = await vscode.workspace.openTextDocument(uri2);
        await vscode.window.showTextDocument(doc1, { viewColumn: vscode.ViewColumn.One, preview: false });
        await vscode.window.showTextDocument(doc2, { viewColumn: vscode.ViewColumn.Two, preview: false });
        const result = await runTool('get_open_files', {});
        logResult('get_open_files', result);
        assert.ok(Array.isArray(result) && result.length >= 1, 'Expected open files listing');
        await deleteIfExists(uri2);
    }).timeout(20000);

    test('cursor context / position / move_cursor with tag', async () => {
        const doc = await vscode.workspace.openTextDocument(indexUri);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const cursorPos = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(cursorPos, cursorPos);
        const context = await runTool('get_cursor_context', { textDocument: { uri: indexUri.toString() }, before: 1, after: 1 });
        logResult('get_cursor_context', context);
        assert.ok(context && context.tag, 'Expected tag from cursor context');
        const moved = await runTool('move_cursor', { tag: context.tag });
        logResult('move_cursor(tag)', moved);
        assert.ok(moved && moved.moved === true, 'Expected cursor to move via tag');
        const cursorInfo = await runTool('get_cursor_position', {});
        logResult('get_cursor_position', cursorInfo);
        assert.strictEqual(cursorInfo.uri, context.uri);
    }).timeout(20000);

    test('run configuration lifecycle', async () => {
        const name = `Flow Config ${Date.now()}`;
        const add = await runTool('add_run_configuration', { configuration: { name, type: 'node', request: 'launch', program: '${workspaceFolder}/index.js' } });
        logResult('add_run_configuration', add);
        const list1 = await runTool('list_run_configurations', {});
        logResult('list_run_configurations#1', list1);
        const update = await runTool('update_run_configuration', { name, configuration: { program: '${workspaceFolder}/updated.js' } });
        logResult('update_run_configuration', update);
        const list2 = await runTool('list_run_configurations', {});
        logResult('list_run_configurations#2', list2);
        const del = await runTool('delete_run_configuration', { name });
        logResult('delete_run_configuration', del);
        const list3 = await runTool('list_run_configurations', {});
        logResult('list_run_configurations#3', list3);
        assert.ok(Array.isArray(list1), 'List should return array');
        assert.ok(Array.isArray(list2), 'List after update should return array');
        assert.ok(Array.isArray(list3), 'List after delete should return array');
    }).timeout(20000);

    test('build task lifecycle', async () => {
        const label = `flow-build-${Date.now()}`;
        const add = await runTool('add_build_task', { task: { label, type: 'shell', command: 'echo build-flow' } });
        logResult('add_build_task', add);
        const list1 = await runTool('list_build_tasks', {});
        logResult('list_build_tasks#1', list1);
        const update = await runTool('update_build_task', { label, task: { command: 'echo build-flow-updated' } });
        logResult('update_build_task', update);
        const list2 = await runTool('list_build_tasks', {});
        logResult('list_build_tasks#2', list2);
        const del = await runTool('remove_build_task', { label });
        logResult('remove_build_task', del);
        const list3 = await runTool('list_build_tasks', {});
        logResult('list_build_tasks#3', list3);
        assert.ok(Array.isArray(list1), 'List should return array');
        assert.ok(Array.isArray(list3), 'List after delete should return array');
    }).timeout(20000);

    test('move_file then delete_file', async () => {
        const src = await createTempFile('tmp-flow-src.txt', 'flow');
        const dest = vscode.Uri.joinPath(sampleWorkspaceUri, 'tmp-flow-dest.txt');
        const moveRes = await runTool('move_file', { source: src.toString(), destination: dest.toString() });
        logResult('move_file', moveRes);
        assert.ok(moveRes && moveRes.moved !== undefined, 'Expected move_file result');
        const delRes = await runTool('delete_file', { uri: dest.toString() });
        logResult('delete_file', delRes);
        assert.ok(delRes && delRes.deleted !== undefined, 'Expected delete_file result');
        await deleteIfExists(dest);
    }).timeout(20000);

    test('run_all_tests then get_last_test_results', async () => {
        const runAll = await runTool('run_all_tests', {});
        logResult('run_all_tests', runAll);
        assert.ok(Array.isArray(runAll), 'run_all_tests should return array (may be empty)');
        const last = await runTool('get_last_test_results', {});
        logResult('get_last_test_results', last);
        assert.ok(Array.isArray(last), 'Expected last test results array');
    }).timeout(20000);
});
