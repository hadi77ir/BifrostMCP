import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { runTool } from '../toolRunner';

interface SpecContext {
    args: any;
    cleanup?: () => Promise<void> | void;
}

const logResult = (name: string, result: any) => {
    // eslint-disable-next-line no-console
    console.log(`[cursor test][${name}]`, JSON.stringify(result, null, 2));
};

suite('Cursor-sensitive commands', () => {
    process.env.BIFROST_AUTO_APPROVE = '1';
    const repoRoot = vscode.Uri.file(path.resolve(__dirname, '..', '..'));
    const sampleWorkspaceUri = vscode.Uri.joinPath(repoRoot, 'sample-ts-workspace');
    const exampleUri = vscode.Uri.joinPath(sampleWorkspaceUri, 'src/example.ts');
    let originalFolders: readonly vscode.WorkspaceFolder[] | undefined;

    const positionOf = async (uri: vscode.Uri, needle: string) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const idx = doc.getText().indexOf(needle);
        if (idx < 0) {
            return { line: 0, character: 0 };
        }
        const before = doc.getText().slice(0, idx);
        const lines = before.split(/\r?\n/);
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        return { line, character };
    };

    const createTempFile = async (relPath: string, contents: string) => {
        const uri = vscode.Uri.joinPath(sampleWorkspaceUri, relPath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(contents, 'utf8'));
        return uri;
    };

    const deleteIfExists = async (uri: vscode.Uri) => {
        try {
            await vscode.workspace.fs.delete(uri);
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
        const doc = await vscode.workspace.openTextDocument(exampleUri);
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

    const specs: {
        name: string;
        prepare?: () => Promise<SpecContext>;
        verify?: (result: any) => void;
        tool?: string;
        timeout?: number;
    }[] = [
        {
            name: 'find_usages',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('find_usages', result);
                assert.ok(Array.isArray(result) && result.length >= 1, 'Expected at least one usage');
                assert.ok(result.every((r: any) => typeof r.uri === 'string'), 'Expected uri strings in results');
            }
        },
        {
            name: 'go_to_definition',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('go_to_definition', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected definition locations');
                assert.ok(result.every((loc: any) => typeof loc.uri === 'string'), 'Definition results should have uri');
            }
        },
        {
            name: 'get_hover_info',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('get_hover_info', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected hover info');
                assert.ok(result[0].contents.length > 0, 'Hover should include contents');
            }
        },
        {
            name: 'get_completions',
            prepare: async () => {
                const uri = await createTempFile('tmp-completion.ts', 'const n = Math.\n');
                const pos = { line: 0, character: 'const n = Math.'.length };
                return { args: { textDocument: { uri: uri.toString() }, position: pos }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                logResult('get_completions', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected completion items');
                assert.ok(result.some((item: any) => item.label === 'abs'), 'Expected Math.abs in completions');
            }
        },
        {
            name: 'get_signature_help',
            prepare: async () => {
                const uri = await createTempFile('tmp-signature.ts', 'Math.max(1, 2);\n');
                const pos = { line: 0, character: 'Math.max('.length };
                return { args: { textDocument: { uri: uri.toString() }, position: pos }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                logResult('get_signature_help', result);
                const signatures = Array.isArray(result) ? result : result?.signatures;
                assert.ok(Array.isArray(signatures) && signatures.length > 0, 'Expected signatures');
            }
        },
        {
            name: 'get_rename_locations',
            prepare: async () => {
                const uri = await createTempFile('tmp-rename-locs.ts', 'const alpha = 1;\nconsole.log(alpha);\n');
                const pos = await positionOf(uri, 'alpha');
                return { args: { textDocument: { uri: uri.toString() }, position: pos }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                logResult('get_rename_locations', result);
                assert.ok(Array.isArray(result) && result.length >= 1, 'Expected rename locations');
                assert.ok(result[0]?.edits?.length > 0, 'Expected edits for rename locations');
            }
        },
        {
            name: 'rename',
            prepare: async () => {
                const uri = await createTempFile('tmp-rename-cursor.ts', 'const bravo = 2;\nconsole.log(bravo);\n');
                const pos = await positionOf(uri, 'bravo');
                return { args: { textDocument: { uri: uri.toString() }, position: pos, newName: 'charlie' }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                logResult('rename', result);
                assert.ok(result && result.isError === false, 'Expected rename command to respond without error');
            }
        },
        {
            name: 'get_code_actions',
            prepare: async () => {
                const uri = await createTempFile('tmp-actions.ts', 'import { greet } from "./index";\n\nconsole.log("hi");\n');
                const pos = { line: 0, character: 5 };
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
                return { args: { textDocument: { uri: uri.toString() }, position: pos }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                logResult('get_code_actions', result);
                assert.ok(Array.isArray(result), 'Expected code actions array (may be empty depending on provider)');
            }
        },
        {
            name: 'get_selection_range',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('get_selection_range', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected selection ranges');
            }
        },
        {
            name: 'get_type_definition',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('get_type_definition', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected type definition locations');
            }
        },
        {
            name: 'get_declaration',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('get_declaration', result);
                assert.ok(Array.isArray(result), 'Expected declaration results array');
            }
        },
        {
            name: 'get_document_highlights',
            prepare: async () => {
                const pos = await positionOf(exampleUri, 'greet(');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: pos } };
            },
            verify: result => {
                logResult('get_document_highlights', result);
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected document highlights');
            }
        }
    ];

    specs.forEach(spec => {
        test(`cursor command: ${spec.name}`, async () => {
            const ctx = spec.prepare ? await spec.prepare() : { args: {} };
            const result = await runTool(spec.tool ?? spec.name, ctx.args);
            spec.verify?.(result);
            await ctx.cleanup?.();
        }).timeout(spec.timeout ?? 20000);
    });
});
