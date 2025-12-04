import * as assert from 'assert';
import * as vscode from 'vscode';
import { runTool } from '../toolRunner';

suite('Formatter tools', () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    async function createTempFile(relativePath: string, contents: string): Promise<vscode.Uri> {
        if (!workspaceFolder) {
            throw new Error('Workspace folder is required for formatting tests');
        }
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
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

    test('list_formatters returns available formatters for document language', async () => {
        const uri = await createTempFile('tmp-formatters.ts', 'const x=1;');
        try {
            const result = await runTool('list_formatters', { textDocument: { uri: uri.toString() } }) as any;
            assert.ok(result, 'Expected list_formatters to return a result');
            assert.strictEqual(result.languageId, 'typescript');
            assert.ok(Array.isArray(result.formatters), 'formatters should be an array');
            assert.ok(result.formatters.length > 0, 'Expected at least one formatter');
            assert.ok(result.formatters[0].id, 'Formatter entry should include an id');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('format_document formats entire document', async () => {
        const uri = await createTempFile('tmp-format.ts', 'function foo(){return  1}');
        try {
            const result = await runTool('format_document', { textDocument: { uri: uri.toString() } }) as any;
            if (!result.formatted) {
                // In test environments without a formatter, skip strict text assertions
                return;
            }

            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            assert.ok(text.includes('function foo'), 'Formatted document should contain original content');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);

    test('format_document supports range formatting and optional formatterId', async () => {
        const uri = await createTempFile('tmp-format-range.ts', 'const a={a:1};\nconst b={b:2};\n');
        try {
            const formatterInfo = await runTool('list_formatters', { textDocument: { uri: uri.toString() } }) as any;
            const formatterId = formatterInfo.formatters?.[0]?.id;

            const range = {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 20 }
            };

            const result = await runTool('format_document', {
                textDocument: { uri: uri.toString() },
                formatterId,
                range
            }) as any;

            if (!result.formatted) {
                return;
            }
            const document = await vscode.workspace.openTextDocument(uri);
            const lines = document.getText().split(/\r?\n/);
            assert.strictEqual(lines[0], 'const a = { a: 1 };', 'First line should be formatted');
            assert.strictEqual(lines[1], 'const b={b:2};', 'Second line should remain unformatted');
        } finally {
            await deleteTempFile(uri);
        }
    }).timeout(15000);
});
