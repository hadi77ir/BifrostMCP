import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';

const execAsync = util.promisify(exec);

interface TerminalRunResult {
    output: string;
    stderr?: string;
    exitCode?: number | null;
    method: 'shellIntegration' | 'child_process' | 'unknown';
}

export async function runTerminalCommand(command: string, cwd?: string, timeoutMs: number = 10000): Promise<TerminalRunResult> {
    const terminal = vscode.window.createTerminal({ name: 'Bifrost Command Runner', cwd });
    const shellIntegration: any = (terminal as any).shellIntegration;

    if (shellIntegration?.executeCommand) {
        let output = '';
        try {
            const execution = shellIntegration.executeCommand(command);
            const reader: AsyncIterable<string> = execution.read();
            const controller = new AbortController();

            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            for await (const chunk of reader) {
                if (controller.signal.aborted) {
                    break;
                }
                output += chunk;
            }
            clearTimeout(timeout);
            return { output: stripAnsi(output).trim(), stderr: '', exitCode: null, method: 'shellIntegration' };
        } catch (error) {
            // fall through to child_process below
        }
    }

    try {
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: timeoutMs });
        return {
            output: stdout.trim(),
            stderr: stderr?.trim(),
            exitCode: 0,
            method: 'child_process'
        };
    } catch (error: any) {
        return {
            output: error?.stdout?.toString().trim() ?? '',
            stderr: error?.stderr?.toString().trim() ?? error?.message ?? '',
            exitCode: error?.code ?? null,
            method: 'child_process'
        };
    }
}

export interface RegexSearchResult {
    uri: string;
    line: number;
    text: string;
    contextBefore: string[];
    contextAfter: string[];
}

export async function searchRegex(
    query: string,
    base: vscode.WorkspaceFolder | vscode.Uri | undefined,
    maxResults: number = 50
): Promise<RegexSearchResult[]> {
    const folderUri = base && 'uri' in base ? (base as vscode.WorkspaceFolder).uri : base as vscode.Uri | undefined;
    const results: RegexSearchResult[] = [];

    const findTextInFiles = (vscode.workspace as any).findTextInFiles as ((...args: any[]) => Thenable<void> | void) | undefined;
    if (findTextInFiles) {
        try {
            await findTextInFiles(
                { pattern: query, isRegExp: true },
                folderUri ? { include: new vscode.RelativePattern(folderUri, '**/*') } : undefined,
                (result: any) => {
                    if (results.length >= maxResults) {
                        return;
                    }
                    if (result.preview) {
                        const line = result.ranges[0].start.line;
                        const docUri = result.uri;
                        results.push({
                            uri: docUri.toString(),
                            line,
                            text: result.preview.text,
                            contextBefore: [],
                            contextAfter: []
                        });
                    }
                }
            );
        } catch {
            // fall back to manual scanning below
        }
    }

    if (results.length === 0) {
        const regex = new RegExp(query, 'g');
        const folder = folderUri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
        if (folder) {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, '**/*'),
                '**/{node_modules,.git,out,dist,.vscode,.idea}/**',
                maxResults * 2
            );
            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                const lines = doc.getText().split(/\r?\n/);
                lines.forEach((text, line) => {
                    if (results.length >= maxResults) return;
                    if (regex.test(text)) {
                        results.push({
                            uri: file.toString(),
                            line,
                            text,
                            contextBefore: line > 0 ? [lines[line - 1]] : [],
                            contextAfter: line < lines.length - 1 ? [lines[line + 1]] : []
                        });
                    }
                    regex.lastIndex = 0; // reset for next line
                });
                if (results.length >= maxResults) break;
            }
        }
    }

    // Populate context lines for collected results
    for (const item of results) {
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(item.uri));
            const lines = doc.getText().split(/\r?\n/);
            const start = Math.max(0, item.line - 1);
            const end = Math.min(lines.length - 1, item.line + 1);
            item.contextBefore = start < item.line ? lines.slice(start, item.line) : [];
            item.contextAfter = end > item.line ? lines.slice(item.line + 1, end + 1) : [];
        } catch {
            // ignore failures to add context
        }
    }
    return results.slice(0, maxResults);
}

export interface FileEntry {
    path: string;
    type: 'file';
}

export async function listWorkspaceFiles(
    folder: vscode.WorkspaceFolder | undefined,
    limit: number = 200
): Promise<FileEntry[]> {
    if (!folder) {
        return [];
    }
    const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/*'),
        '**/{node_modules,.git,out,dist,.vscode,.idea}/**',
        limit
    );
    return uris.map(uri => ({
        path: path.relative(folder.uri.fsPath, uri.fsPath),
        type: 'file' as const
    }));
}

export interface DefinitionSummary {
    name: string;
    kind: string;
    detail?: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

export async function summarizeDefinitions(documentUri: vscode.Uri): Promise<DefinitionSummary[]> {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        documentUri
    );

    if (!symbols) {
        return [];
    }

    const flatten = (items: vscode.DocumentSymbol[]): DefinitionSummary[] => {
        const acc: DefinitionSummary[] = [];
        for (const sym of items) {
            acc.push({
                name: sym.name,
                kind: vscode.SymbolKind[sym.kind],
                detail: sym.detail,
                range: {
                    start: { line: sym.range.start.line, character: sym.range.start.character },
                    end: { line: sym.range.end.line, character: sym.range.end.character }
                }
            });
            if (sym.children?.length) {
                acc.push(...flatten(sym.children));
            }
        }
        return acc;
    };

    return flatten(symbols);
}

function stripAnsi(input: string): string {
    return input.replace(
        // eslint-disable-next-line no-control-regex
        /\u001b\[.*?m/g,
        ''
    );
}
