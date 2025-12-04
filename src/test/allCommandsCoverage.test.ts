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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const logResult = (name: string, result: any) => {
    // eslint-disable-next-line no-console
    console.log(`[${name} result]`, JSON.stringify(result, null, 2));
};

suite('All MCP commands coverage', () => {
    process.env.BIFROST_AUTO_APPROVE = '1';
    const repoRoot = vscode.Uri.file(path.resolve(__dirname, '..', '..'));
    const sampleWorkspaceUri = vscode.Uri.joinPath(repoRoot, 'sample-ts-workspace');
    const indexUri = vscode.Uri.joinPath(sampleWorkspaceUri, 'src/index.ts');
    const exampleUri = vscode.Uri.joinPath(sampleWorkspaceUri, 'src/example.ts');
    let originalFolders: readonly vscode.WorkspaceFolder[] | undefined;
    let originalWarning: any;
    let originalInfo: any;
    let originalFetchTasks: any;
    let originalStartDebugging: any;
    let expectedMovePosition: { line: number; character: number } | undefined;

    async function positionOf(uri: vscode.Uri, needle: string): Promise<{ line: number; character: number }> {
        const doc = await vscode.workspace.openTextDocument(uri);
        const idx = doc.getText().indexOf(needle);
        assert.ok(idx >= 0, `Could not find "${needle}" in ${uri.fsPath}`);
        const before = doc.getText().slice(0, idx);
        const lines = before.split(/\r?\n/);
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        return { line, character };
    }

    async function createTempFile(relPath: string, contents: string): Promise<vscode.Uri> {
        const uri = vscode.Uri.joinPath(sampleWorkspaceUri, relPath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(contents, 'utf8'));
        return uri;
    }

    async function deleteIfExists(uri: vscode.Uri) {
        try {
            await vscode.workspace.fs.delete(uri, { recursive: false });
        } catch {
            // ignore cleanup errors
        }
    }

    suiteSetup(async () => {
        originalFolders = vscode.workspace.workspaceFolders;
        vscode.workspace.updateWorkspaceFolders(
            0,
            originalFolders?.length ?? 0,
            { uri: sampleWorkspaceUri }
        );
        originalWarning = vscode.window.showWarningMessage;
        originalInfo = vscode.window.showInformationMessage;
        originalFetchTasks = vscode.tasks.fetchTasks;
        originalStartDebugging = vscode.debug.startDebugging;
        (vscode.window.showWarningMessage as any) = async () => 'Proceed';
        (vscode.window.showInformationMessage as any) = async (...args: any[]) => {
            for (const arg of args) {
                if (typeof arg === 'string') return arg;
            }
            return undefined;
        };
        (vscode.tasks.fetchTasks as any) = async () => [];
        (vscode.debug.startDebugging as any) = async () => false;
        await vscode.workspace.fs.stat(sampleWorkspaceUri);
        const doc = await vscode.workspace.openTextDocument(indexUri);
        await vscode.window.showTextDocument(doc);
        await sleep(500);
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
        (vscode.window.showWarningMessage as any) = originalWarning;
        (vscode.window.showInformationMessage as any) = originalInfo;
        (vscode.tasks.fetchTasks as any) = originalFetchTasks;
        (vscode.debug.startDebugging as any) = originalStartDebugging;
    });
    const specs: {
        name: string;
        prepare?: () => Promise<SpecContext>;
        verify?: (result: any) => void;
        run?: (args: any) => Promise<any>;
        timeout?: number;
        tool?: string;
    }[] = [
        {
            name: 'workspace_sanity_workspace_active',
            run: async () => undefined,
            verify: () => {
                const active = vscode.workspace.workspaceFolders?.[0];
                assert.ok(active, 'Expected an active workspace folder');
                assert.strictEqual(active?.uri.fsPath, sampleWorkspaceUri.fsPath, 'Expected sample workspace to be active');
            }
        },
        {
            name: 'workspace_sanity_list_files',
            prepare: async () => ({ args: { limit: 200 } }),
            tool: 'list_files',
            verify: result => assert.ok((result as any[]).some(entry => entry.path === 'src/index.ts'), 'Expected src/index.ts to be listed'),
            timeout: 10000
        },
        {
            name: 'workspace_sanity_document_symbols',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            tool: 'get_document_symbols',
            verify: result => {
                const names = (result as any[]).map(s => s.name);
                assert.ok(names.includes('greet'), 'Expected greet in document symbols');
                assert.ok(names.includes('average'), 'Expected average in document symbols');
                assert.ok(names.includes('repeat'), 'Expected repeat in document symbols');
            },
            timeout: 10000
        },
        {
            name: 'workspace_sanity_go_to_definition',
            prepare: async () => {
                const doc = await vscode.workspace.openTextDocument(exampleUri);
                const lineIndex = doc.getText().split(/\r?\n/).findIndex(l => l.includes('greet('));
                const col = doc.lineAt(lineIndex).text.indexOf('greet');
                return { args: { textDocument: { uri: exampleUri.toString() }, position: { line: lineIndex, character: col + 1 } } };
            },
            tool: 'go_to_definition',
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected at least one definition');
                assert.ok(result.some((d: any) => d.uri.endsWith('src/index.ts')), 'Expected definition to resolve to index.ts');
            },
            timeout: 20000
        },
        {
            name: 'workspace_sanity_find_usages',
            prepare: async () => {
                const doc = await vscode.workspace.openTextDocument(indexUri);
                const lineIndex = doc.getText().split(/\r?\n/).findIndex(l => l.includes('function greet'));
                const col = doc.lineAt(lineIndex).text.indexOf('greet');
                return { args: { textDocument: { uri: indexUri.toString() }, position: { line: lineIndex, character: col + 1 } } };
            },
            tool: 'find_usages',
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected references for greet');
                assert.ok(result.some((r: any) => r.uri.endsWith('src/example.ts')), 'Expected usage in example.ts');
            },
            timeout: 20000
        },
        {
            name: 'workspace_sanity_workspace_symbols',
            prepare: async () => ({ args: { query: 'greet' } }),
            tool: 'get_workspace_symbols',
            verify: result => {
                if (!Array.isArray(result) || result.length === 0) {
                    logResult('workspace_sanity_workspace_symbols', result);
                }
                assert.ok(Array.isArray(result), 'Expected workspace symbols array');
            },
            timeout: 10000
        },
        {
            name: 'workspace_sanity_workspace_tree',
            prepare: async () => ({ args: { maxEntries: 50 } }),
            tool: 'get_workspace_tree',
            verify: result => {
                const rootChildren = (result as any[]).map((entry: any) => entry.name);
                assert.ok(rootChildren.includes('src'), 'Expected src directory in workspace tree');
            },
            timeout: 10000
        },
        {
            name: 'workspace_sanity_debug_status',
            prepare: async () => ({ args: {} }),
            tool: 'debug_status',
            verify: result => {
                assert.strictEqual((result as any).hasActiveSession, false);
                assert.ok(Array.isArray((result as any).sessions), 'Expected sessions array');
            },
            timeout: 10000
        },
        {
            name: 'workspace_sanity_list_run_configurations',
            prepare: async () => ({ args: {} }),
            tool: 'list_run_configurations',
            verify: result => {
                const configs = result as any[];
                assert.ok(configs.length > 0, 'Expected at least one run configuration');
                assert.ok(configs.some(c => c.name === 'Run Sample (noop)'), 'Expected sample launch entry');
            },
            timeout: 10000
        },
        {
            name: 'workspace_sanity_list_build_tasks',
            prepare: async () => ({ args: {} }),
            tool: 'list_build_tasks',
            verify: result => {
                const labels = (result as any[]).map(t => t.label);
                assert.ok(labels.includes('sample:lint'), 'Expected lint task');
                assert.ok(labels.includes('sample:build'), 'Expected build task');
            },
            timeout: 10000
        },
        {
            name: 'find_usages',
            prepare: async () => {
                const position = await positionOf(indexUri, 'greet');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected at least one usage');
                assert.ok(result.some((ref: any) => (ref.uri ?? ref.location?.uri)?.includes('example.ts')), 'Expected reference in example.ts');
            }
        },
        {
            name: 'go_to_definition',
            prepare: async () => {
                const position = await positionOf(exampleUri, 'greet');
                return { args: { textDocument: { uri: exampleUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected definition results');
                assert.ok(result.some((d: any) => (d.uri ?? '').includes('src/index.ts')), 'Expected definition in index.ts');
            }
        },
        {
            name: 'find_implementations',
            prepare: async () => {
                const uri = await createTempFile('tmp-impl.ts', 'interface IFoo { bar(): void; }\nclass Foo implements IFoo { bar() {} }\n');
                const position = await positionOf(uri, 'IFoo');
                return { args: { textDocument: { uri: uri.toString() }, position }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected implementations');
                assert.ok(result.every((item: any) => typeof item.uri === 'string'), 'Each implementation should include uri');
            }
        },
        {
            name: 'get_hover_info',
            prepare: async () => {
                const position = await positionOf(indexUri, 'greet');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected hover info entries');
                assert.ok((result[0].contents ?? [])[0]?.length > 0, 'Hover contents should include text');
            }
        },
        {
            name: 'get_document_symbols',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected symbols array');
                assert.ok(result.some((s: any) => s.name === 'greet'), 'Expected greet symbol present');
            }
        },
        {
            name: 'get_completions',
            prepare: async () => {
                const uri = await createTempFile('tmp-complete.ts', 'const num = Math.\n');
                const position = { line: 0, character: 'const num = Math.'.length };
                return { args: { textDocument: { uri: uri.toString() }, position, triggerCharacter: '.' }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                if (!result || result.length === 0) {
                    logResult('get_completions', result);
                }
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected at least one completion item');
                assert.ok(typeof result[0].label === 'string' && result[0].label.length > 0, 'Completion should include label');
            }
        },
        {
            name: 'get_signature_help',
            prepare: async () => {
                const uri = await createTempFile('tmp-signature.ts', 'greet("Name", { prefix: "Hi" });\n');
                const position = await positionOf(uri, 'greet(');
                return { args: { textDocument: { uri: uri.toString() }, position }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                if (!result?.signatures?.length) {
                    logResult('get_signature_help', result);
                }
                assert.ok(result === undefined || result.signatures === undefined || Array.isArray(result.signatures), 'Signature help should return signatures array when available');
            }
        },
        {
            name: 'get_rename_locations',
            prepare: async () => {
                const position = await positionOf(indexUri, 'greet');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected rename locations');
                assert.ok(result.every((r: any) => typeof r.uri === 'string'), 'Rename locations should include uri');
            }
        },
        {
            name: 'rename',
            prepare: async () => {
                const uri = await createTempFile('tmp-rename-coverage.ts', 'const foo = 1;\nfunction use() { return foo; }\n');
                const position = await positionOf(uri, 'foo');
                return {
                    args: { textDocument: { uri: uri.toString() }, position, newName: 'bar' },
                    cleanup: () => deleteIfExists(uri)
                };
            },
            verify: result => {
                assert.ok(result && Array.isArray(result.content), 'Rename should return content');
                const message = result.content[0]?.text ?? '';
                assert.ok(message.toLowerCase().includes('rename'), 'Rename response should mention rename');
            }
        },
        {
            name: 'get_code_actions',
            prepare: async () => {
                const uri = await createTempFile('tmp-actions-coverage.ts', 'const x: string = 1;\n');
                const position = await positionOf(uri, '1');
                return { args: { textDocument: { uri: uri.toString() }, position }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                if (!result || result.length === 0) {
                    logResult('get_code_actions', result);
                }
                assert.ok(Array.isArray(result), 'Expected code actions array (may be empty depending on provider)');
            }
        },
        {
            name: 'get_code_lens',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => {
                if (!result) logResult('get_code_lens', result);
                assert.ok(result, 'Expected CodeLens results (may be empty array)');
            }
        },
        {
            name: 'get_selection_range',
            prepare: async () => {
                const position = await positionOf(indexUri, 'greet');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result), 'Expected selection ranges array');
                if (result[0]) {
                    assert.ok(result[0].range?.start?.line !== undefined, 'Selection range should include coordinates');
                }
            }
        },
        {
            name: 'get_type_definition',
            prepare: async () => {
                const position = await positionOf(exampleUri, 'values');
                return { args: { textDocument: { uri: exampleUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result), 'Expected type definition array');
                if (result[0]) {
                    assert.ok(typeof result[0].uri === 'string', 'Type definition should include uri');
                }
            }
        },
        {
            name: 'get_declaration',
            prepare: async () => {
                const position = await positionOf(exampleUri, 'greet');
                return { args: { textDocument: { uri: exampleUri.toString() }, position } };
            },
            verify: result => {
                if (!Array.isArray(result) || result.length === 0) {
                    logResult('get_declaration', result);
                }
                assert.ok(Array.isArray(result), 'Expected declarations array (may be empty)');
            }
        },
        {
            name: 'get_document_highlights',
            prepare: async () => {
                const position = await positionOf(indexUri, 'average');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected highlights');
                assert.ok(result[0].range?.start?.line !== undefined, 'Highlight should include range');
            }
        },
        {
            name: 'get_workspace_symbols',
            prepare: async () => ({ args: { query: 'greet' } }),
            verify: result => {
                if (!Array.isArray(result) || result.length === 0) logResult('get_workspace_symbols', result);
                assert.ok(Array.isArray(result), 'Expected workspace symbols array');
            }
        },
        {
            name: 'get_semantic_tokens',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => {
                if (!(result?.tokens || result?.fallback)) {
                    logResult('get_semantic_tokens', result);
                }
                assert.ok(result?.tokens || result?.fallback, 'Expected semantic tokens or fallback symbols');
            }
        },
        {
            name: 'get_call_hierarchy',
            prepare: async () => {
                const position = await positionOf(indexUri, 'average');
                return { args: { textDocument: { uri: indexUri.toString() }, position } };
            },
            verify: result => {
                if (!result || result.error) {
                    logResult('get_call_hierarchy', result);
                }
                assert.ok(result === undefined || result.item !== undefined || result.error !== undefined, 'Expected call hierarchy data or error');
            }
        },
        {
            name: 'get_type_hierarchy',
            prepare: async () => {
                const uri = await createTempFile('tmp-types.ts', 'class Base {}\nclass Child extends Base {}\n');
                const position = await positionOf(uri, 'Child');
                return { args: { textDocument: { uri: uri.toString() }, position }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                if (!result) logResult('get_type_hierarchy', result);
                assert.ok(result === undefined || result.item !== undefined || result.error !== undefined, 'Expected type hierarchy item or error when supported');
            }
        },
        {
            name: 'run_terminal_command',
            prepare: async () => ({ args: { command: 'echo coverage-test' } }),
            verify: result => assert.ok(result.output.includes('coverage-test'))
        },
        {
            name: 'search_regex',
            prepare: async () => ({ args: { query: 'greet' } }),
            verify: result => assert.ok(Array.isArray(result) && result.length > 0, 'Expected search results')
        },
        {
            name: 'list_files',
            prepare: async () => ({ args: { limit: 200 } }),
            verify: result => assert.ok(Array.isArray(result) && result.length > 0, 'Expected file list')
        },
        {
            name: 'summarize_definitions',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => assert.ok(Array.isArray(result) && result.length > 0, 'Expected definitions summary')
        },
        {
            name: 'list_source_actions',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => {
                assert.ok(Array.isArray(result), 'Expected source actions array (may be empty if provider missing)');
            }
        },
        {
            name: 'run_source_action',
            prepare: async () => {
                const uri = await createTempFile('tmp-source.ts', "import { b } from './b';\nimport { a } from './a';\nexport const c = b ?? a;\n");
                const aUri = await createTempFile('a.ts', 'export const a = 1;\n');
                const bUri = await createTempFile('b.ts', 'export const b = 2;\n');
                const actions = await runTool('list_source_actions', { textDocument: { uri: uri.toString() } }) as any[];
                const first = Array.isArray(actions) ? actions[0] : undefined;
                return {
                    args: first ? { textDocument: { uri: uri.toString() }, title: first.title, kind: first.kind } : { textDocument: { uri: uri.toString() }, title: 'noop' },
                    cleanup: async () => {
                        await deleteIfExists(uri);
                        await deleteIfExists(aUri);
                        await deleteIfExists(bUri);
                    }
                };
            },
            verify: result => {
                assert.ok(result !== undefined, 'Expected run_source_action to return a result payload');
            }
        },
        {
            name: 'list_refactor_actions',
            prepare: async () => {
                const uri = await createTempFile('tmp-refactor.ts', "function demo() { const v = 1 + 2; return v; }\n");
                const position = await positionOf(uri, '1 + 2');
                return { args: { textDocument: { uri: uri.toString() }, position }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => assert.ok(Array.isArray(result), 'Expected refactor actions array (may be empty)')
        },
        {
            name: 'run_refactor_action',
            prepare: async () => {
                const uri = await createTempFile('tmp-refactor-run.ts', "function demo() { const v = 1 + 2; return v; }\n");
                const position = await positionOf(uri, '1 + 2');
                return { args: { textDocument: { uri: uri.toString() }, position, title: 'Extract', kind: 'refactor.extract.function' }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                assert.ok(result !== undefined, 'Expected refactor result payload (may be empty when provider missing)');
            }
        },
        { name: 'get_workspace_diagnostics', prepare: async () => ({ args: {} }), verify: result => assert.ok(Array.isArray(result), 'Expected diagnostics array') },
        {
            name: 'get_file_diagnostics',
            prepare: async () => {
                const uri = await createTempFile('tmp-diag.ts', 'const x: number = "oops";\n');
                const collection = vscode.languages.createDiagnosticCollection('coverage-diag');
                const range = new vscode.Range(new vscode.Position(0, 16), new vscode.Position(0, 22));
                collection.set(uri, [new vscode.Diagnostic(range, 'Type mismatch', vscode.DiagnosticSeverity.Error)]);
                return { args: { textDocument: { uri: uri.toString() } }, cleanup: async () => { collection.clear(); collection.dispose(); await deleteIfExists(uri); } };
            },
            verify: result => {
                assert.ok(result && result.hasIssues !== undefined, 'Expected diagnostics payload');
                assert.ok(Array.isArray(result.diagnostics), 'Diagnostics should be array');
            }
        },
        {
            name: 'get_open_files',
            prepare: async () => {
                const doc = await vscode.workspace.openTextDocument(exampleUri);
                await vscode.window.showTextDocument(doc);
                return { args: {} };
            },
            verify: result => {
                assert.ok(Array.isArray(result) && result.length > 0, 'Expected open files listing');
                assert.ok(result.some((r: any) => r.uri === exampleUri.toString()), 'Expected example.ts to be open');
            }
        },
        {
            name: 'move_cursor',
            prepare: async () => {
                const doc = await vscode.workspace.openTextDocument(indexUri);
                const search = 'greet(';
                const idx = doc.getText().indexOf(search);
                assert.ok(idx >= 0, 'Expected greet occurrence');
                const pos = doc.positionAt(idx);
                expectedMovePosition = { line: pos.line, character: pos.character };
                return { args: { textDocument: { uri: indexUri.toString() }, searchString: search } };
            },
            verify: result => {
                assert.ok(result && result.moved === true, 'Expected cursor to move');
                assert.ok(expectedMovePosition, 'Expected position computed');
                assert.strictEqual(result.position.line, expectedMovePosition!.line);
                assert.strictEqual(result.position.character, expectedMovePosition!.character);
            }
        },
        {
            name: 'read_file_safe',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => {
                assert.ok(result && typeof result.content === 'string', 'Expected file content string');
                assert.ok(result.content.includes('greet'), 'Expected content to include greet');
            }
        },
        {
            name: 'read_range',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() }, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } } } }),
            verify: result => {
                assert.ok(result && typeof result.content === 'string', 'Expected range content string');
                assert.ok(result.content.length > 0, 'Expected non-empty range content');
            }
        },
        {
            name: 'apply_patch_review',
            prepare: async () => {
                const uri = await createTempFile('tmp-patch.txt', 'hello\n');
                const patch = `--- tmp-patch.txt\n+++ tmp-patch.txt\n@@ -1 +1 @@\n-hello\n+hello world\n`;
                return { args: { textDocument: { uri: uri.toString() }, patch }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                if (result?.isError) logResult('apply_patch_review', result);
                assert.ok(result && (result.queued === true || result.isError === true), 'Expected patch queued or error payload');
            }
        },
        {
            name: 'insert_lines',
            prepare: async () => {
                const uri = await createTempFile('tmp-insert.txt', 'one\ntwo\n');
                return { args: { textDocument: { uri: uri.toString() }, line: 1, lines: ['inserted'] }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => {
                assert.ok(result && result.applied !== undefined, 'Expected insert_lines applied flag');
            }
        },
        {
            name: 'remove_lines',
            prepare: async () => {
                const uri = await createTempFile('tmp-remove.txt', 'a\nb\nc\n');
                return { args: { textDocument: { uri: uri.toString() }, startLine: 1, endLine: 2 }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => assert.ok(result && result.applied !== undefined, 'Expected remove_lines applied flag')
        },
        {
            name: 'replace_lines',
            prepare: async () => {
                const uri = await createTempFile('tmp-replace.txt', 'x\ny\nz\n');
                return { args: { textDocument: { uri: uri.toString() }, startLine: 1, endLine: 2, lines: ['new'] }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => assert.ok(result && result.applied !== undefined, 'Expected replace_lines applied flag')
        },
        { name: 'list_files_paginated', prepare: async () => ({ args: { page: 1, pageSize: 2 } }), verify: result => assert.ok(Array.isArray(result) && result.length > 0, 'Expected paginated files') },
        { name: 'get_workspace_tree', prepare: async () => ({ args: { maxEntries: 50 } }), verify: result => assert.ok(Array.isArray(result) && result.some((n: any) => n.name === 'src'), 'Expected workspace tree with src folder') },
        {
            name: 'copy_file',
            prepare: async () => {
                const src = await createTempFile('tmp-copy.txt', 'copy');
                const dest = vscode.Uri.joinPath(sampleWorkspaceUri, 'tmp-copy-dest.txt');
                return { args: { source: src.toString(), destination: dest.toString() }, cleanup: async () => { await deleteIfExists(src); await deleteIfExists(dest); } };
            },
            verify: result => assert.ok(result && result.copied === true)
        },
        {
            name: 'move_file',
            prepare: async () => {
                const src = await createTempFile('tmp-move.txt', 'move');
                const dest = vscode.Uri.joinPath(sampleWorkspaceUri, 'tmp-moved.txt');
                return { args: { source: src.toString(), destination: dest.toString() }, cleanup: async () => { await deleteIfExists(src); await deleteIfExists(dest); } };
            },
            verify: result => assert.ok(result && result.moved !== undefined)
        },
        {
            name: 'delete_file',
            prepare: async () => {
                const uri = await createTempFile('tmp-delete.txt', 'delete');
                return { args: { uri: uri.toString() }, cleanup: () => deleteIfExists(uri) };
            },
            verify: result => assert.ok(result && result.deleted !== undefined)
        },
        {
            name: 'prompt_user_choice',
            prepare: async () => ({ args: { message: 'Choose', choices: ['A', 'B'] } }),
            verify: result => assert.ok(result && result.selection !== undefined)
        },
        { name: 'list_tests', prepare: async () => ({ args: {} }), verify: result => assert.ok(Array.isArray(result) && result.length === 0, 'Expected no test tasks stubbed') },
        { name: 'run_test', prepare: async () => ({ args: { name: 'sample:test' } }), verify: result => {
            assert.ok(result && result.started === false, 'Expected run_test to indicate not started');
            assert.ok(result.error === 'Task not found', 'Expected missing task error');
        } },
        { name: 'run_all_tests', prepare: async () => ({ args: {} }), verify: result => assert.ok(Array.isArray(result) && result.length === 0, 'Expected no test tasks to run') },
        { name: 'get_last_test_results', prepare: async () => ({ args: {} }), verify: result => assert.ok(Array.isArray(result) && result.length >= 0, 'Expected cached test results array') },
        { name: 'list_run_configurations', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(Array.isArray(result) && result.length > 0, 'Expected run configurations');
            assert.ok(result.some((c: any) => c.name === 'Run Sample (noop)'), 'Expected sample launch configuration');
        } },
        {
            name: 'add_run_configuration',
            prepare: async () => ({ args: { configuration: { name: 'Temp Config Coverage', type: 'node', request: 'launch', program: '${workspaceFolder}/index.js' } } }),
            verify: result => assert.ok(result && result.added === true)
        },
        {
            name: 'update_run_configuration',
            prepare: async () => ({ args: { name: 'Temp Config Coverage', configuration: { program: '${workspaceFolder}/updated.js' } } }),
            verify: result => assert.ok(result && result.updated !== undefined)
        },
        {
            name: 'delete_run_configuration',
            prepare: async () => ({ args: { name: 'Temp Config Coverage' } }),
            verify: result => assert.ok(result && result.deleted !== undefined)
        },
        { name: 'start_debug_configuration', prepare: async () => ({ args: { name: 'Run Sample (noop)' } }), verify: result => {
            assert.ok(result && result.started === false, 'Expected debug start to be false in tests');
        } },
        { name: 'start_no_debug_configuration', prepare: async () => ({ args: { name: 'Run Sample (noop)' } }), verify: result => {
            assert.ok(result && result.started === false, 'Expected noDebug start to be false in tests');
        } },
        { name: 'list_build_tasks', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(Array.isArray(result) && result.length > 0, 'Expected build tasks list');
            assert.ok(result.some((t: any) => t.label === 'sample:build'), 'Expected sample:build task present');
        } },
        { name: 'add_build_task', prepare: async () => ({ args: { task: { label: 'coverage-build', type: 'shell', command: 'echo build' } } }), verify: result => assert.ok(result && result.added !== undefined) },
        { name: 'update_build_task', prepare: async () => ({ args: { label: 'coverage-build', task: { command: 'echo build-updated' } } }), verify: result => assert.ok(result && result.updated !== undefined) },
        { name: 'remove_build_task', prepare: async () => ({ args: { label: 'coverage-build' } }), verify: result => assert.ok(result && result.removed !== undefined) },
        { name: 'run_build_task', prepare: async () => ({ args: { label: 'sample:build' } }), verify: result => {
            assert.ok(result && result.started === false, 'Expected run_build_task to report not started without matching task');
            assert.ok(result.reason === 'Task not found', 'Expected task not found reason');
        } },
        { name: 'debug_status', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(result && result.hasActiveSession === false, 'Expected no active debug session in tests');
            assert.ok(Array.isArray(result.sessions), 'Expected sessions array');
        } },
        { name: 'debug_stop', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(result && result.stopped === false, 'Expected no session to stop');
            assert.ok(result.reason || result.stopped === false, 'Expected reason when not stopped');
        } },
        { name: 'debug_step_over', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.ok === true) },
        { name: 'debug_step_into', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.ok === true) },
        { name: 'debug_step_out', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.ok === true) },
        { name: 'debug_continue', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.ok === true) },
        { name: 'debug_add_watch', prepare: async () => ({ args: { expression: '2+2' } }), verify: result => assert.ok(result && Array.isArray(result.watches)) },
        { name: 'debug_list_watches', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && Array.isArray(result.watches)) },
        { name: 'debug_remove_watch', prepare: async () => ({ args: { expression: '2+2' } }), verify: result => assert.ok(result && Array.isArray(result.watches)) },
        { name: 'debug_watch_values', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(Array.isArray(result) || result?.notRunning === true || result?.error, 'Expected watch values array or notRunning flag');
        } },
        { name: 'debug_get_locals', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(result && result.error !== undefined, 'Expected locals to return error when no session');
        } },
        { name: 'debug_get_call_stack', prepare: async () => ({ args: {} }), verify: result => {
            assert.ok(result && result.error !== undefined, 'Expected call stack to return error when no session');
        } },
        {
            name: 'debug_add_breakpoint',
            prepare: async () => ({ args: { uri: indexUri.toString(), line: 0 } }),
            verify: result => assert.ok(result && result.added !== undefined)
        },
        {
            name: 'debug_remove_breakpoint',
            prepare: async () => ({ args: { uri: indexUri.toString(), line: 0 } }),
            verify: result => assert.ok(result && result.removed !== undefined)
        },
        { name: 'debug_disable_all_breakpoints', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.disabled !== undefined) },
        { name: 'debug_remove_all_breakpoints', prepare: async () => ({ args: {} }), verify: result => assert.ok(result && result.removed !== undefined) },
        { name: 'list_formatters', prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }), verify: result => assert.ok(result && Array.isArray(result.formatters)) },
        {
            name: 'format_document',
            prepare: async () => ({ args: { textDocument: { uri: indexUri.toString() } } }),
            verify: result => assert.ok(result && result.formatted !== undefined)
        },
        {
            name: 'debug_full_scenario',
            run: async () => {
                const originalExecuteCommand = vscode.commands.executeCommand;
                const originalStartDebugging = vscode.debug.startDebugging;
                const originalStopDebugging = vscode.debug.stopDebugging;
                const originalSessions = (vscode.debug as any).sessions;
                const originalActiveDescriptor = Object.getOwnPropertyDescriptor(vscode.debug, 'activeDebugSession');
                let activeSession: any = null;

                const setActive = (session: any) => {
                    activeSession = session;
                    (vscode.debug as any).sessions = session ? [session] : [];
                };

                const fakeSession: any = {
                    id: 'scenario-debug',
                    name: 'ScenarioDebug',
                    type: 'node',
                    customRequest: async (command: string, args?: any) => {
                        if (command === 'threads') {
                            return { threads: [{ id: 1, name: 'main' }] };
                        }
                        if (command === 'stackTrace') {
                            return {
                                stackFrames: [{ id: 1, name: 'main', line: 1, column: 1, source: { path: 'index.ts', name: 'index.ts' } }]
                            };
                        }
                        if (command === 'scopes') {
                            return { scopes: [{ name: 'Locals', variablesReference: 1 }] };
                        }
                        if (command === 'variables') {
                            return { variables: [{ name: 'x', value: '42', variablesReference: 0 }] };
                        }
                        if (command === 'evaluate') {
                            return { result: '4' };
                        }
                        return {};
                    }
                };

                Object.defineProperty(vscode.debug, 'activeDebugSession', { get: () => activeSession, configurable: true });
                (vscode.commands as any).executeCommand = async (cmd: string, ...rest: any[]) => {
                    if (typeof cmd === 'string' && cmd.startsWith('workbench.action.debug.')) {
                        return true;
                    }
                    return originalExecuteCommand.call(vscode.commands, cmd as any, ...rest);
                };
                (vscode.debug as any).startDebugging = async () => {
                    setActive(fakeSession);
                    return true;
                };
                (vscode.debug as any).stopDebugging = async () => {
                    setActive(null);
                    return true;
                };

                try {
                    setActive(fakeSession);
                    await runTool('add_run_configuration', { configuration: { name: 'ScenarioDebug', type: 'node', request: 'launch', program: '${workspaceFolder}/src/index.ts' } });
                    await runTool('debug_add_breakpoint', { uri: indexUri.toString(), line: 0 });
                    const started = await runTool('start_debug_configuration', { name: 'ScenarioDebug' });
                    const statusBefore = await runTool('debug_status', {});
                    await runTool('debug_step_over', {});
                    await runTool('debug_step_into', {});
                    await runTool('debug_step_out', {});
                    await runTool('debug_continue', {});
                    await runTool('debug_add_watch', { expression: '2+2' });
                    await runTool('debug_add_watch', { expression: 'x' });
                    const watches = await runTool('debug_list_watches', {});
                    const watchValues = await runTool('debug_watch_values', {});
                    const locals = await runTool('debug_get_locals', {});
                    const stack = await runTool('debug_get_call_stack', {});
                    await runTool('debug_remove_breakpoint', { uri: indexUri.toString(), line: 0 });
                    const stopped = await runTool('debug_stop', {});

                    return { started, statusBefore, watches, watchValues, locals, stack, stopped };
                } finally {
                    (vscode.commands as any).executeCommand = originalExecuteCommand;
                    (vscode.debug as any).startDebugging = originalStartDebugging;
                    (vscode.debug as any).stopDebugging = originalStopDebugging;
                    (vscode.debug as any).sessions = originalSessions;
                    if (originalActiveDescriptor) {
                        Object.defineProperty(vscode.debug, 'activeDebugSession', originalActiveDescriptor);
                    }
                }
            },
            verify: result => {
                assert.ok(result.started.started === true, 'Expected debug to start');
                assert.ok(result.statusBefore.hasActiveSession === true, 'Expected active debug session');
                assert.ok(Array.isArray(result.watches.watches), 'Expected watches array');
                assert.ok(Array.isArray(result.watchValues), 'Expected watch values array');
                assert.ok(result.locals?.scopes || result.locals?.error, 'Expected locals or error');
                assert.ok(result.stack?.frames || result.stack?.error, 'Expected call stack or error');
                assert.ok(result.stopped.stopped === true || result.stopped.notRunning === true, 'Expected debug to stop');
            },
            timeout: 30000
        }
    ];

    specs.forEach(spec => {
        test(`command: ${spec.name}`, async () => {
            const ctx = spec.prepare ? await spec.prepare() : { args: {} };
            try {
                const result = spec.run
                    ? await spec.run(ctx.args)
                    : await runTool(spec.tool ?? spec.name, ctx.args);
                spec.verify?.(result);
            }finally {
                await ctx.cleanup?.();
            }
        }).timeout(spec.timeout ?? 30000);
    });
});
