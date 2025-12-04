import * as vscode from 'vscode';
import { createVscodePosition, getPreview, convertSymbol, asyncMap, convertSemanticTokens, getSymbolKindString, transformLocations, transformSingleLocation } from './helpers';
import { ReferencesAndPreview, RenameEdit } from './rosyln';
import { mcpTools } from './tools';
import { runTerminalCommand, searchRegex, listWorkspaceFiles, summarizeDefinitions } from './commandTools';
import { queuePatch } from './reviewManager';
import * as Diff from 'diff';
import * as path from 'path';
import { listRunConfigurations, saveRunConfigurations, listBuildTasks, saveBuildTasks } from './configTools';
import { addWatch, listWatches, removeWatch, evaluateWatches, getLocals, getCallStack } from './debugTools';
import { isAutoApprove } from './modeSwitch';

const toolNames = mcpTools.map((tool) => tool.name);
const cursorTagMap = new Map<string, { uri: string; position: vscode.Position }>();
const createRandomCursorTag = () => `<cursor-${Math.random().toString(36).slice(2, 12)}>`;

const getLiveDocument = async (uri: vscode.Uri): Promise<vscode.TextDocument> => {
    const existing = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (existing) {
        return existing;
    }
    return vscode.workspace.openTextDocument(uri);
};

const saveIfOpen = async (uri: vscode.Uri) => {
    const existing = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (existing && existing.isDirty) {
        await existing.save();
    }
};

const applyCodeAction = async (action: vscode.CodeAction | vscode.Command): Promise<boolean> => {
    let appliedEdit = false;
    const asAction = action as vscode.CodeAction;
    if (asAction.edit) {
        appliedEdit = await vscode.workspace.applyEdit(asAction.edit);
    }
    const command = asAction.command ?? (action as vscode.Command);
    if (command?.command) {
        await vscode.commands.executeCommand(command.command, ...(command.arguments ?? []));
    }
    return appliedEdit || Boolean(command);
};

const findActions = async (
    uri: vscode.Uri,
    range: vscode.Range,
    onlyKind: vscode.CodeActionKind
): Promise<vscode.CodeAction[]> => {
    const attempt = async () => {
        try {
            let kind: vscode.CodeActionKind;
            if (onlyKind instanceof vscode.CodeActionKind) {
                kind = onlyKind;
            } else if (typeof (onlyKind as any)?.value === 'string') {
                kind = vscode.CodeActionKind.Empty.append((onlyKind as any).value);
            } else if (typeof (onlyKind as any) === 'string') {
                kind = vscode.CodeActionKind.Empty.append(onlyKind as any);
            } else {
                kind = vscode.CodeActionKind.Empty;
            }
            const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                uri,
                range,
                { only: kind }
            );
            return actions ?? [];
        } catch {
            return [];
        }
    };

    // Retry a few times to allow language service to warm up.
    for (let i = 0; i < 6; i++) {
        const actions = await attempt();
        if (actions.length > 0 || i === 5) {
            return actions;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return [];
};

const ensureManualSourceActions = (actions: vscode.CodeAction[]): vscode.CodeAction[] => {
    const existing = new Set(actions.map(a => a.title.toLowerCase()));
    const manual: { title: string; kind: vscode.CodeActionKind; command?: vscode.Command }[] = [
        {
            title: 'Remove unused code',
            kind: vscode.CodeActionKind.SourceFixAll.append('unused'),
        },
        {
            title: 'Remove unused imports',
            kind: vscode.CodeActionKind.SourceOrganizeImports.append('unused'),
        },
        {
            title: 'Organize imports',
            kind: vscode.CodeActionKind.SourceOrganizeImports,
            command: { command: 'editor.action.organizeImports', title: 'Organize imports' }
        },
        {
            title: 'Add all missing imports',
            kind: vscode.CodeActionKind.Source.append('addMissingImports')
        },
        {
            title: 'Sort imports',
            kind: vscode.CodeActionKind.SourceOrganizeImports.append('sort')
        }
    ];
    manual.forEach(m => {
        if (!existing.has(m.title.toLowerCase())) {
            const action = new vscode.CodeAction(m.title, m.kind);
            if (m.command) {
                action.command = m.command;
            }
            actions.push(action);
        }
    });
    actions.sort((a, b) => a.title.localeCompare(b.title));
    return actions;
};

const loadSourceActions = async (
    uri: vscode.Uri,
    range: vscode.Range
): Promise<vscode.CodeAction[]> => {
    try {
        const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
            'vscode.executeCodeActionProvider',
            uri,
            range
        );
        const filtered = (actions ?? []).filter(a => (a.kind?.value ?? '').startsWith('source'));
        return ensureManualSourceActions(filtered);
    } catch {
        return ensureManualSourceActions([]);
    }
};

const convertDiagnostic = (uri: vscode.Uri, diag: vscode.Diagnostic) => ({
    uri: uri.toString(),
    range: {
        start: {
            line: diag.range.start.line,
            character: diag.range.start.character
        },
        end: {
            line: diag.range.end.line,
            character: diag.range.end.character
        }
    },
    severity: vscode.DiagnosticSeverity[diag.severity],
    message: diag.message,
    source: diag.source,
    code: diag.code
});

const toPositiveInteger = (value: unknown): number | undefined => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num) || num <= 0) {
        return undefined;
    }
    return Math.floor(num);
};

const normalizePagination = (args: any): { limit: number | undefined; page: number } => {
    const limit = toPositiveInteger(args?.limit);
    const page = toPositiveInteger(args?.page) ?? 1;
    return { limit, page };
};

const applyLineEdit = async (
    uri: vscode.Uri,
    transform: (lines: string[]) => { next: string[], description: string }
) => {
    const doc = await getLiveDocument(uri);
    const wasDirty = doc.isDirty;
    const original = doc.getText();
    const lines = original.split(/\r?\n/);
    const { next, description } = transform(lines);
    const updated = next.join('\n');
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
        uri,
        new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(original.length)
        ),
        updated
    );
    const applied = await vscode.workspace.applyEdit(edit);
    if (applied && !wasDirty) {
        await doc.save();
    }
    const patch = Diff.createPatch(uri.fsPath, original, updated);
    return { applied, description, patch };
};

let lastTestResults: { name: string; exitCode: number | null }[] = [];

const isUriInWorkspace = (uri: vscode.Uri) => {
    const folders = vscode.workspace.workspaceFolders;
    return folders?.some(f => uri.fsPath.startsWith(f.uri.fsPath)) ?? false;
};

const confirmIfNeeded = async (message: string, uri?: vscode.Uri): Promise<boolean> => {
    if (isAutoApprove() || process.env.BIFROST_AUTO_APPROVE === '1') {
        return true;
    }
    if (uri && !isUriInWorkspace(uri)) {
        const choice = await vscode.window.showWarningMessage(`${message} (outside workspace)`, { modal: true }, 'Proceed', 'Cancel');
        return choice === 'Proceed';
    }
    const choice = await vscode.window.showWarningMessage(message, { modal: true }, 'Proceed', 'Cancel');
    return choice === 'Proceed';
};

const fetchTestTasks = async (): Promise<vscode.Task[]> => {
    const tasks = await vscode.tasks.fetchTasks();
    return tasks.filter(t => t.group === vscode.TaskGroup.Test || t.group?.id === vscode.TaskGroup.Test.id);
};

const executeTaskAndWait = async (task: vscode.Task): Promise<{ name: string; exitCode: number | null }> => {
    const exec = await vscode.tasks.executeTask(task);
    return await new Promise(resolve => {
        const disposable = vscode.tasks.onDidEndTaskProcess(e => {
            if (e.execution === exec) {
                disposable.dispose();
                resolve({ name: task.name, exitCode: e.exitCode ?? null });
            }
        });
    });
};

export const runTool = async (name: string, args: any) => {
    let result: any;
    if (!toolNames.includes(name)) {
        throw new Error(`Unknown tool: ${name}`);
    }
    // Verify file exists before proceeding when provided
    let uri: vscode.Uri = args?.textDocument?.uri
        ? vscode.Uri.parse(args.textDocument.uri)
        : (vscode.window.activeTextEditor?.document.uri ?? vscode.Uri.file('/tmp/bifrost-placeholder'));
    if (args?.textDocument?.uri) {
        try {
            await vscode.workspace.fs.stat(uri);
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: File not found - ${uri.fsPath ?? 'unknown'}`
                }],
                isError: true
            };
        }
    }

    const position = args?.position ? createVscodePosition(
        args.position.line,
        args.position.character
    ) : undefined;

    let command: string;
    let commandResult: any;
    
    switch (name) {
        case "find_usages":
            command = 'vscode.executeReferenceProvider';
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                command,
                uri,
                position
            );

            if (!locations) {
                result = [];
                break;
            }
            const references: ReferencesAndPreview[] = await asyncMap(
                locations,
                transformSingleLocation
            );
            result = references;
            break;

        case "go_to_definition":
            command = 'vscode.executeDefinitionProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "find_implementations":
            command = 'vscode.executeImplementationProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_hover_info":
            command = 'vscode.executeHoverProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await asyncMap(commandResult, async (hover: vscode.Hover) => ({
                contents: hover.contents.map(content => 
                    typeof content === 'string' ? content : content.value
                ),
                range: hover.range ? {
                    start: {
                        line: hover.range.start.line,
                        character: hover.range.start.character
                    },
                    end: {
                        line: hover.range.end.line,
                        character: hover.range.end.character
                    }
                } : undefined,
                preview: await getPreview(uri!, hover.range?.start.line)
            }));
            break;

        case "get_document_symbols":
            command = 'vscode.executeDocumentSymbolProvider';
            commandResult = await vscode.commands.executeCommand(command, uri);
            result = commandResult?.map(convertSymbol);
            break;

        case "get_completions":
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                uri,
                position,
                args?.triggerCharacter
            );
            result = completions?.items.map(item => ({
                label: item.label,
                kind: item.kind,
                detail: item.detail,
                documentation: item.documentation,
                sortText: item.sortText,
                filterText: item.filterText,
                insertText: item.insertText,
                range: item.range && ('start' in item.range) ? {
                    start: {
                        line: item.range.start.line,
                        character: item.range.start.character
                    },
                    end: {
                        line: item.range.end.line,
                        character: item.range.end.character
                    }
                } : undefined
            }));
            break;

        case "get_signature_help":
            const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
                'vscode.executeSignatureHelpProvider',
                uri,
                position
            );
            result = signatureHelp?.signatures.map(sig => ({
                label: sig.label,
                documentation: sig.documentation,
                parameters: sig.parameters?.map(param => ({
                    label: param.label,
                    documentation: param.documentation
                })),
                activeParameter: signatureHelp.activeParameter,
                activeSignature: signatureHelp.activeSignature
            }));
            break;

        case "get_rename_locations": {
            const newName = args?.newName || "newName";
            const renameEdits = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                'vscode.executeDocumentRenameProvider',
                uri,
                position,
                newName
            );
            if (renameEdits) {
                const entries: RenameEdit[] = [];
                for (const [editUri, edits] of renameEdits.entries()) {
                    entries.push({
                        uri: editUri.toString(),
                        edits: edits.map(edit => ({
                            range: {
                                start: {
                                    line: edit.range.start.line,
                                    character: edit.range.start.character
                                },
                                end: {
                                    line: edit.range.end.line,
                                    character: edit.range.end.character
                                }
                            },
                            newText: edit.newText
                        }))
                    });
                }
                result = entries;
            } else {
                result = [];
            }
            break;
        }
       
        case "rename": {
            const newName = args?.newName || "newName";
            const renameEdits = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                'vscode.executeDocumentRenameProvider',
                uri,
                position,
                newName
            );
            if (renameEdits) {
                const success = await vscode.workspace.applyEdit(renameEdits);
                return {
                    content: [{
                        type: "text",
                        text: success ? "Symbol renamed successfully" : "Symbol renaming failed"
                    }],
                    isError: false
                };
            } else {
                return {
                    content: [{
                        type: "text",
                        text: "Symbol to rename not found"
                    }],
                    isError: false
                };
            }
            break;
        }

        case "get_code_actions":
            const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                uri,
                position ? new vscode.Range(position, position) : undefined
            );
            result = codeActions?.map(action => ({
                title: action.title,
                kind: action.kind?.value,
                isPreferred: action.isPreferred,
                diagnostics: action.diagnostics?.map(diag => ({
                    message: diag.message,
                    severity: diag.severity,
                    range: {
                        start: {
                            line: diag.range.start.line,
                            character: diag.range.start.character
                        },
                        end: {
                            line: diag.range.end.line,
                            character: diag.range.end.character
                        }
                    }
                }))
            }));
            break;

        case "get_code_lens":
            const codeLensUri = vscode.Uri.parse((args as any).textDocument?.uri);
            try {
                const codeLensResult = await vscode.commands.executeCommand<vscode.CodeLens[]>(
                    'vscode.executeCodeLensProvider',
                    codeLensUri
                );

                if (!codeLensResult || codeLensResult.length === 0) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "No CodeLens items found in document" 
                        }],
                        isError: false
                    };
                }

                result = codeLensResult.map(lens => ({
                    range: {
                        start: {
                            line: lens.range.start.line,
                            character: lens.range.start.character
                        },
                        end: {
                            line: lens.range.end.line,
                            character: lens.range.end.character
                        }
                    },
                    command: lens.command ? {
                        title: lens.command.title,
                        command: lens.command.command,
                        arguments: lens.command.arguments
                    } : undefined
                }));
            } catch (error) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error executing CodeLens provider: ${error}` 
                    }],
                    isError: true
                };
            }
            break;
    
        case "get_selection_range":
            const selectionRanges = await vscode.commands.executeCommand<vscode.SelectionRange[]>(
                'vscode.executeSelectionRangeProvider',
                uri,
                [position]
            );
            result = selectionRanges?.map(range => ({
                range: {
                    start: {
                        line: range.range.start.line,
                        character: range.range.start.character
                    },
                    end: {
                        line: range.range.end.line,
                        character: range.range.end.character
                    }
                },
                parent: range.parent ? {
                    range: {
                        start: {
                            line: range.parent.range.start.line,
                            character: range.parent.range.start.character
                        },
                        end: {
                            line: range.parent.range.end.line,
                            character: range.parent.range.end.character
                        }
                    }
                } : undefined
            }));
            break;

        case "get_type_definition":
            command = 'vscode.executeTypeDefinitionProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_declaration":
            command = 'vscode.executeDeclarationProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_document_highlights":
            const highlights = await vscode.commands.executeCommand<vscode.DocumentHighlight[]>(
                'vscode.executeDocumentHighlights',
                uri,
                position
            );
            result = highlights?.map(highlight => ({
                range: {
                    start: {
                        line: highlight.range.start.line,
                        character: highlight.range.start.character
                    },
                    end: {
                        line: highlight.range.end.line,
                        character: highlight.range.end.character
                    }
                },
                kind: highlight.kind
            }));
            break;

        case "get_workspace_symbols": {
            const query = args.query || '';
            const { limit, page } = normalizePagination(args);
            const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeWorkspaceSymbolProvider',
                query
            );
            const totalSymbols = symbols?.length ?? 0;
            const safePage = Math.max(1, page);
            const totalPages = limit ? Math.ceil(totalSymbols / limit) : (totalSymbols > 0 ? 1 : 0);
            const slice = limit
                ? symbols?.slice((safePage - 1) * limit, safePage * limit)
                : symbols;
            const entries = slice?.map(symbol => ({
                name: symbol.name,
                kind: symbol.kind,
                location: {
                    uri: symbol.location.uri.toString(),
                    range: {
                        start: {
                            line: symbol.location.range.start.line,
                            character: symbol.location.range.start.character
                        },
                        end: {
                            line: symbol.location.range.end.line,
                            character: symbol.location.range.end.character
                        }
                    }
                },
                containerName: symbol.containerName
            })) ?? [];
            result = Object.assign(entries, {
                totalSymbols,
                page: safePage,
                totalPages,
                limit: limit ?? null
            });
            break;
        }

        case "get_semantic_tokens":
            const semanticTokensUri = vscode.Uri.parse((args as any).textDocument?.uri);
            
            // Check if semantic tokens provider is available
            const providers = await vscode.languages.getLanguages();
            const document = await vscode.workspace.openTextDocument(semanticTokensUri);
            const hasSemanticTokens = providers.includes(document.languageId);
            
            if (!hasSemanticTokens) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Semantic tokens not supported for language: ${document.languageId}` 
                    }],
                    isError: true
                };
            }

            try {
                const semanticTokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
                    'vscode.provideDocumentSemanticTokens',
                    semanticTokensUri
                );

                if (!semanticTokens) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "No semantic tokens found in document" 
                        }],
                        isError: false
                    };
                }

                // Convert to human-readable format
                const readableTokens = convertSemanticTokens(semanticTokens, document);
                
                result = {
                    resultId: semanticTokens.resultId,
                    tokens: readableTokens
                };
            } catch (error) {
                // If the command is not found, try alternative approach
                const tokenTypes = [
                    'namespace', 'class', 'enum', 'interface',
                    'struct', 'typeParameter', 'type', 'parameter',
                    'variable', 'property', 'enumMember', 'decorator',
                    'event', 'function', 'method', 'macro', 'keyword',
                    'modifier', 'comment', 'string', 'number', 'regexp',
                    'operator'
                ];
                
                // Use document symbols as fallback
                const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                    'vscode.executeDocumentSymbolProvider',
                    semanticTokensUri
                );

                if (symbols) {
                    result = {
                        fallback: "Using document symbols as fallback",
                        symbols: symbols.map(symbol => ({
                            name: symbol.name,
                            kind: symbol.kind,
                            range: {
                                start: {
                                    line: symbol.range.start.line,
                                    character: symbol.range.start.character
                                },
                                end: {
                                    line: symbol.range.end.line,
                                    character: symbol.range.end.character
                                }
                            },
                            tokenType: tokenTypes[symbol.kind] || 'unknown'
                        }))
                    };
                } else {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "Semantic tokens provider not available and fallback failed" 
                        }],
                        isError: true
                    };
                }
            }
            break;

        case "get_call_hierarchy":
            try {
                const callHierarchyItems = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
                    'vscode.prepareCallHierarchy',
                    uri,
                    position
                );
                
                if (callHierarchyItems?.[0]) {
                    const [incomingCalls, outgoingCalls] = await Promise.all([
                        vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
                            'vscode.executeCallHierarchyIncomingCalls',
                            callHierarchyItems[0]
                        ),
                        vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
                            'vscode.executeCallHierarchyOutgoingCalls',
                            callHierarchyItems[0]
                        )
                    ]);

                    result = {
                        item: {
                            name: callHierarchyItems[0].name,
                            kind: getSymbolKindString(callHierarchyItems[0].kind),
                            detail: callHierarchyItems[0].detail,
                            uri: callHierarchyItems[0].uri.toString(),
                            range: {
                                start: {
                                    line: callHierarchyItems[0].range.start.line,
                                    character: callHierarchyItems[0].range.start.character
                                },
                                end: {
                                    line: callHierarchyItems[0].range.end.line,
                                    character: callHierarchyItems[0].range.end.character
                                }
                            }
                        },
                        incomingCalls: incomingCalls?.map(call => ({
                            from: {
                                name: call.from.name,
                                kind: getSymbolKindString(call.from.kind),
                                uri: call.from.uri.toString(),
                                range: {
                                    start: {
                                        line: call.from.range.start.line,
                                        character: call.from.range.start.character
                                    },
                                    end: {
                                        line: call.from.range.end.line,
                                        character: call.from.range.end.character
                                    }
                                }
                            },
                            fromRanges: call.fromRanges.map(range => ({
                                start: {
                                    line: range.start.line,
                                    character: range.start.character
                                },
                                end: {
                                    line: range.end.line,
                                    character: range.end.character
                                }
                            }))
                        })),
                        outgoingCalls: outgoingCalls?.map(call => ({
                            to: {
                                name: call.to.name,
                                kind: getSymbolKindString(call.to.kind),
                                uri: call.to.uri.toString(),
                                range: {
                                    start: {
                                        line: call.to.range.start.line,
                                        character: call.to.range.start.character
                                    },
                                    end: {
                                        line: call.to.range.end.line,
                                        character: call.to.range.end.character
                                    }
                                }
                            },
                            fromRanges: call.fromRanges.map(range => ({
                                start: {
                                    line: range.start.line,
                                    character: range.start.character
                                },
                                end: {
                                    line: range.end.line,
                                    character: range.end.character
                                }
                            }))
                        }))
                    };
                }
            } catch (error: any) {
                result = { error: error?.message ?? String(error) };
            }
            break;

        case "get_type_hierarchy":
            const typeHierarchyItems = await vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                'vscode.prepareTypeHierarchy',
                uri,
                position
            );
            
            if (typeHierarchyItems?.[0]) {
                const [supertypes, subtypes] = await Promise.all([
                    vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                        'vscode.executeTypeHierarchySupertypeCommand',
                        typeHierarchyItems[0]
                    ),
                    vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                        'vscode.executeTypeHierarchySubtypeCommand',
                        typeHierarchyItems[0]
                    )
                ]);

                result = {
                    item: {
                        name: typeHierarchyItems[0].name,
                        kind: getSymbolKindString(typeHierarchyItems[0].kind),
                        detail: typeHierarchyItems[0].detail,
                        uri: typeHierarchyItems[0].uri.toString(),
                        range: {
                            start: {
                                line: typeHierarchyItems[0].range.start.line,
                                character: typeHierarchyItems[0].range.start.character
                            },
                            end: {
                                line: typeHierarchyItems[0].range.end.line,
                                character: typeHierarchyItems[0].range.end.character
                            }
                        }
                    },
                    supertypes: supertypes?.map(type => ({
                        name: type.name,
                        kind: getSymbolKindString(type.kind),
                        detail: type.detail,
                        uri: type.uri.toString(),
                        range: {
                            start: {
                                line: type.range.start.line,
                                character: type.range.start.character
                            },
                            end: {
                                line: type.range.end.line,
                                character: type.range.end.character
                            }
                        }
                    })),
                    subtypes: subtypes?.map(type => ({
                        name: type.name,
                        kind: getSymbolKindString(type.kind),
                        detail: type.detail,
                        uri: type.uri.toString(),
                        range: {
                            start: {
                                line: type.range.start.line,
                                character: type.range.start.character
                            },
                            end: {
                                line: type.range.end.line,
                                character: type.range.end.character
                            }
                        }
                    }))
                };
            }
            break;

        case "run_terminal_command": {
            const command = args?.command;
            if (!command || typeof command !== 'string') {
                throw new Error('command is required for run_terminal_command');
            }
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = args?.cwd
                ? vscode.Uri.joinPath(workspaceFolder?.uri ?? vscode.Uri.file('/'), args.cwd).fsPath
                : workspaceFolder?.uri.fsPath;
            if (!(await confirmIfNeeded(`Run terminal command "${command}"?`))) {
                result = { executed: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            result = await runTerminalCommand(command, cwd, args?.timeoutMs);
            break;
        }

        case "run_vscode_command": {
            const command = args?.command;
            const cmdArgs = Array.isArray(args?.args) ? args.args : [];
            if (!command || typeof command !== 'string') {
                throw new Error('command is required for run_vscode_command');
            }
            const approved = await confirmIfNeeded(`Run VS Code command "${command}"?`);
            if (!approved) {
                result = { executed: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const res = await vscode.commands.executeCommand(command, ...cmdArgs);
            result = { executed: true, result: res ?? null };
            break;
        }

        case "search_regex": {
            const query = args?.query;
            if (!query) {
                throw new Error('query is required for search_regex');
            }
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const scopedFolder = args?.folder && workspaceFolder
                ? vscode.Uri.joinPath(workspaceFolder.uri, args.folder)
                : workspaceFolder?.uri;
            result = await searchRegex(query, scopedFolder, args?.maxResults);
            break;
        }

        case "list_files": {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            result = await listWorkspaceFiles(workspaceFolder, args?.limit);
            break;
        }

        case "summarize_definitions": {
            const definitions = await summarizeDefinitions(uri);
            result = definitions;
            break;
        }

        case "list_source_actions": {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: true });
            const range = args?.range
                ? new vscode.Range(
                    createVscodePosition(args.range.start.line, args.range.start.character)!,
                    createVscodePosition(args.range.end.line, args.range.end.character)!
                )
                : new vscode.Range(
                    0,
                    0,
                    Math.max(document.lineCount - 1, 0),
                    document.lineAt(Math.max(document.lineCount - 1, 0)).text.length
                );

            const actions = await loadSourceActions(uri, range);
            result = actions.map(action => ({
                title: action.title,
                kind: action.kind?.value,
                isPreferred: action.isPreferred,
                disabled: action.disabled?.reason
            }));
            break;
        }

        case "run_source_action": {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: true });
            const range = args?.range
                ? new vscode.Range(
                    createVscodePosition(args.range.start.line, args.range.start.character)!,
                    createVscodePosition(args.range.end.line, args.range.end.character)!
                )
                : new vscode.Range(
                    0,
                    0,
                    Math.max(document.lineCount - 1, 0),
                    document.lineAt(Math.max(document.lineCount - 1, 0)).text.length
                );
            const title = args?.title;
            const kindFilter: string | undefined = args?.kind;
            if (!title) {
                throw new Error('title is required for run_source_action');
            }
            const actions = await loadSourceActions(uri, range);
            const match = actions.find(a =>
                a.title === title &&
                (!kindFilter || a.kind?.value === kindFilter || a.kind?.value?.startsWith(kindFilter))
            );
            if (!match) {
                result = { applied: false, title, reason: 'Action not found' };
                break;
            }
            const applied = await applyCodeAction(match);
            result = { applied, title: match.title, kind: match.kind?.value };
            break;
        }

        case "list_refactor_actions": {
            if (!position) {
                throw new Error('position is required for list_refactor_actions');
            }
            const document = await vscode.workspace.openTextDocument(uri);
            let range: vscode.Range;
            if (args?.range) {
                const start = createVscodePosition(args.range.start.line, args.range.start.character);
                const end = createVscodePosition(args.range.end.line, args.range.end.character);
                range = new vscode.Range(start!, end!);
            } else {
                const lineLength = document.lineAt(position.line).text.length;
                const endPos = position.character < lineLength
                    ? position.translate(0, 1)
                    : position;
                range = new vscode.Range(position, endPos);
            }
            const actions = await findActions(uri, range, vscode.CodeActionKind.Refactor);
            result = actions.map(action => ({
                title: action.title,
                kind: action.kind?.value,
                isPreferred: action.isPreferred,
                disabled: action.disabled?.reason
            }));
            break;
        }

        case "run_refactor_action": {
            if (!position) {
                throw new Error('position is required for run_refactor_action');
            }
            const title = args?.title;
            const kindFilter: string | undefined = args?.kind;
            if (!title) {
                throw new Error('title is required for run_refactor_action');
            }
            const document = await vscode.workspace.openTextDocument(uri);
            let range: vscode.Range;
            if (args?.range) {
                const start = createVscodePosition(args.range.start.line, args.range.start.character);
                const end = createVscodePosition(args.range.end.line, args.range.end.character);
                range = new vscode.Range(start!, end!);
            } else {
                const lineLength = document.lineAt(position.line).text.length;
                const endPos = position.character < lineLength
                    ? position.translate(0, 1)
                    : position;
                range = new vscode.Range(position, endPos);
            }
            const actions = await findActions(uri, range, vscode.CodeActionKind.Refactor);
            const match = actions.find(a =>
                a.title === title &&
                (!kindFilter || a.kind?.value === kindFilter || a.kind?.value?.startsWith(kindFilter))
            );
            if (!match) {
                const selection = document.getText(range);
                const lineText = document.lineAt(range.start.line).text;
                const indent = lineText.match(/^\s*/)?.[0] ?? '';
                const fallbackName = 'extractedValue';
                if (kindFilter && kindFilter.startsWith('refactor.extract')) {
                    const edit = new vscode.WorkspaceEdit();
                    edit.insert(uri!, new vscode.Position(range.start.line, 0), `${indent}const ${fallbackName} = ${selection};\n`);
                    edit.replace(uri!, range, fallbackName);
                    const applied = await vscode.workspace.applyEdit(edit);
                    result = { applied, title, kind: kindFilter, fallback: true };
                } else {
                    result = { applied: false, title, reason: 'Action not found' };
                }
                break;
            }
            const applied = await applyCodeAction(match);
            result = { applied, title: match.title, kind: match.kind?.value };
            break;
        }

        case "get_workspace_diagnostics": {
            const { limit, page } = normalizePagination(args);
            const diagnostics = vscode.languages.getDiagnostics();
            const totalDiagnostics = diagnostics.reduce((sum, [, diags]) => sum + diags.length, 0);
            const safePage = Math.max(1, page);

            if (!limit) {
                const entries = diagnostics.map(([dUri, diags]) => ({
                    uri: dUri.toString(),
                    hasIssues: diags.length > 0,
                    diagnostics: diags.map(d => convertDiagnostic(dUri, d))
                }));
                result = Object.assign(entries, {
                    totalDiagnostics,
                    page: safePage,
                    totalPages: totalDiagnostics > 0 ? 1 : 0,
                    limit: null
                });
                break;
            }

            const flat = diagnostics.flatMap(([dUri, diags]) =>
                diags.map(diag => ({ uri: dUri, diag }))
            );
            const start = (safePage - 1) * limit;
            const paged = flat.slice(start, start + limit);
            const grouped = new Map<string, { uri: string; hasIssues: boolean; diagnostics: any[] }>();

            for (const { uri: dUri, diag } of paged) {
                const key = dUri.toString();
                const existing = grouped.get(key) ?? { uri: key, hasIssues: false, diagnostics: [] as any[] };
                existing.hasIssues = true;
                existing.diagnostics.push(convertDiagnostic(dUri, diag));
                grouped.set(key, existing);
            }

            const entries = Array.from(grouped.values());
            const totalPages = totalDiagnostics === 0 ? 0 : Math.ceil(totalDiagnostics / limit);
            result = Object.assign(entries, {
                totalDiagnostics,
                page: safePage,
                totalPages,
                limit
            });
            break;
        }

        case "get_file_diagnostics": {
            const { limit, page } = normalizePagination(args);
            const diags = vscode.languages.getDiagnostics(uri);
            const totalDiagnostics = diags.length;
            const safePage = Math.max(1, page);
            const start = limit ? (safePage - 1) * limit : 0;
            const slice = limit ? diags.slice(start, start + limit) : diags;
            const totalPages = limit ? Math.ceil(totalDiagnostics / limit) : (totalDiagnostics > 0 ? 1 : 0);
            result = {
                uri: uri.toString(),
                hasIssues: totalDiagnostics > 0,
                diagnostics: slice.map(d => convertDiagnostic(uri!, d)),
                totalDiagnostics,
                page: safePage,
                totalPages,
                limit: limit ?? null
            };
            break;
        }

        case "get_open_files": {
            const activeEditor = vscode.window.activeTextEditor;
            const entries = new Map<string, {
                uri: string;
                isActive: boolean;
                selections: { start: { line: number; character: number }; end: { line: number; character: number } }[];
                viewColumn?: vscode.ViewColumn;
            }>();

            const upsertEntry = (uri: vscode.Uri, partial: Partial<{
                isActive: boolean;
                selections: { start: { line: number; character: number }; end: { line: number; character: number } }[];
                viewColumn?: vscode.ViewColumn;
            }>) => {
                const key = uri.toString();
                const existing = entries.get(key) ?? {
                    uri: key,
                    isActive: false,
                    selections: [],
                    viewColumn: undefined as vscode.ViewColumn | undefined
                };
                entries.set(key, {
                    uri: key,
                    isActive: existing.isActive || Boolean(partial.isActive),
                    selections: partial.selections ?? existing.selections,
                    viewColumn: existing.viewColumn ?? partial.viewColumn
                });
            };

            for (const editor of vscode.window.visibleTextEditors) {
                upsertEntry(editor.document.uri, {
                    isActive: editor === activeEditor,
                    selections: editor.selections.map(sel => ({
                        start: {
                            line: sel.start.line,
                            character: sel.start.character
                        },
                        end: {
                            line: sel.end.line,
                            character: sel.end.character
                        }
                    })),
                    viewColumn: editor.viewColumn ?? undefined
                });
            }

            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    let tabUri: vscode.Uri | undefined;
                    if (tab.input instanceof vscode.TabInputText) {
                        tabUri = tab.input.uri;
                    } else if (tab.input instanceof vscode.TabInputTextDiff) {
                        tabUri = tab.input.modified;
                    }
                    if (!tabUri) {
                        continue;
                    }
                    upsertEntry(tabUri, {
                        isActive: tab.isActive,
                        viewColumn: group.viewColumn ?? undefined
                    });
                }
            }

            result = Array.from(entries.values());
            break;
        }

        case "get_selected_code": {
            const activeEditor = vscode.window.activeTextEditor;
            const entries = new Map<string, {
                uri: string;
                isActive: boolean;
                selections: {
                    start: { line: number; character: number };
                    end: { line: number; character: number };
                    text: string;
                    isEmpty: boolean;
                }[];
                viewColumn?: vscode.ViewColumn;
            }>();

            const upsertEntry = (uri: vscode.Uri, partial: Partial<{
                isActive: boolean;
                selections: {
                    start: { line: number; character: number };
                    end: { line: number; character: number };
                    text: string;
                    isEmpty: boolean;
                }[];
                viewColumn?: vscode.ViewColumn;
            }>) => {
                const key = uri.toString();
                const existing = entries.get(key) ?? {
                    uri: key,
                    isActive: false,
                    selections: [],
                    viewColumn: undefined as vscode.ViewColumn | undefined
                };
                entries.set(key, {
                    uri: key,
                    isActive: existing.isActive || Boolean(partial.isActive),
                    selections: partial.selections ?? existing.selections,
                    viewColumn: existing.viewColumn ?? partial.viewColumn
                });
            };

            for (const editor of vscode.window.visibleTextEditors) {
                upsertEntry(editor.document.uri, {
                    isActive: editor === activeEditor,
                    viewColumn: editor.viewColumn ?? undefined,
                    selections: editor.selections.map(sel => ({
                        start: {
                            line: sel.start.line,
                            character: sel.start.character
                        },
                        end: {
                            line: sel.end.line,
                            character: sel.end.character
                        },
                        text: editor.document.getText(sel),
                        isEmpty: sel.isEmpty
                    }))
                });
            }

            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    let tabUri: vscode.Uri | undefined;
                    if (tab.input instanceof vscode.TabInputText) {
                        tabUri = tab.input.uri;
                    } else if (tab.input instanceof vscode.TabInputTextDiff) {
                        tabUri = tab.input.modified;
                    }
                    if (!tabUri) {
                        continue;
                    }
                    upsertEntry(tabUri, {
                        isActive: tab.isActive,
                        viewColumn: group.viewColumn ?? undefined
                    });
                }
            }

            result = Array.from(entries.values());
            break;
        }

        case "open_file": {
            const targetUri = args?.textDocument?.uri
                ? vscode.Uri.parse(args.textDocument.uri)
                : undefined;
            if (!targetUri) {
                throw new Error('textDocument.uri is required for open_file');
            }
            const doc = await vscode.workspace.openTextDocument(targetUri);
            const editor = await vscode.window.showTextDocument(doc, { preview: false });
            result = {
                opened: true,
                uri: doc.uri.toString(),
                viewColumn: editor.viewColumn,
                isActive: editor === vscode.window.activeTextEditor
            };
            break;
        }

        case "save_file": {
            const targetUri = args?.textDocument?.uri
                ? vscode.Uri.parse(args.textDocument.uri)
                : undefined;
            if (!targetUri) {
                throw new Error('textDocument.uri is required for save_file');
            }
            const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === targetUri.toString());
            if (!doc) {
                result = { saved: false, notOpen: true, uri: targetUri.toString() };
                break;
            }
            const wasDirty = doc.isDirty;
            const saved = wasDirty ? await doc.save() : true;
            result = { saved, wasDirty, uri: targetUri.toString() };
            break;
        }

        case "close_file": {
            const targetUri = args?.textDocument?.uri
                ? vscode.Uri.parse(args.textDocument.uri)
                : undefined;
            if (!targetUri) {
                throw new Error('textDocument.uri is required for close_file');
            }

            const tabs = vscode.window.tabGroups.all.flatMap(group =>
                group.tabs.map(tab => ({ group, tab }))
            );

            const match = tabs.find(entry => {
                const input = entry.tab.input;
                if (input instanceof vscode.TabInputText) {
                    return input.uri.toString() === targetUri.toString();
                }
                if (input instanceof vscode.TabInputTextDiff) {
                    return input.modified.toString() === targetUri.toString()
                        || input.original.toString() === targetUri.toString();
                }
                return false;
            });

            if (!match) {
                result = { closed: false, notOpen: true, uri: targetUri.toString() };
                break;
            }

            const closed = await vscode.window.tabGroups.close(match.tab);
            result = { closed, uri: targetUri.toString() };
            break;
        }

        case "get_cursor_context": {
            let doc: vscode.TextDocument | undefined;
            if (uri) {
                doc = await vscode.workspace.openTextDocument(uri);
            } else if (vscode.window.activeTextEditor) {
                doc = vscode.window.activeTextEditor.document;
            }
            const editor = vscode.window.activeTextEditor;
            const fallbackPosition = editor && doc && editor.document.uri.toString() === doc.uri.toString()
                ? editor.selection.active
                : undefined;
            const pos = position ?? fallbackPosition;
            if (!doc || !pos) {
                result = { error: 'No document or cursor available' };
                break;
            }
            const before = Math.max(0, args?.before ?? 3);
            const after = Math.max(0, args?.after ?? 3);
            const startLine = Math.max(0, pos.line - before);
            const endLine = Math.min(doc.lineCount - 1, pos.line + after);
            const lines: string[] = [];
            for (let line = startLine; line <= endLine; line++) {
                lines.push(doc.lineAt(line).text);
            }
            const tag = createRandomCursorTag();
            const relIndex = pos.line - startLine;
            const taggedLines = lines.map((l, idx) =>
                idx === relIndex ? l.slice(0, pos.character) + tag + l.slice(pos.character) : l
            );
            const content = taggedLines.join('\n');
            cursorTagMap.set(tag, { uri: doc.uri.toString(), position: pos });
            result = {
                tag,
                uri: doc.uri.toString(),
                position: { line: pos.line, character: pos.character },
                range: { startLine, endLine },
                content
            };
            break;
        }

        case "move_cursor": {
            const tag = args?.tag ?? args?.tagMarker;
            const taggedEntry = tag ? cursorTagMap.get(tag) : undefined;
            let targetUri = taggedEntry ? vscode.Uri.parse(taggedEntry.uri) : uri;
            if (!targetUri && args?.textDocument?.uri) {
                targetUri = vscode.Uri.parse(args.textDocument.uri);
            }
            if (!targetUri && vscode.window.activeTextEditor) {
                targetUri = vscode.window.activeTextEditor.document.uri;
            }
            if (!targetUri) {
                result = { moved: false, reason: 'No document available' };
                break;
            }
            const doc = await vscode.workspace.openTextDocument(targetUri);
            const editor = await vscode.window.showTextDocument(doc);
            let target: vscode.Position | undefined;
            if (taggedEntry?.position) {
                target = taggedEntry.position;
            }
            if (!target && args?.position) {
                target = createVscodePosition(args.position.line, args.position.character);
            }
            if (!target && typeof args?.searchString === 'string') {
                const text = doc.getText();
                const occurrence = Math.max(1, args?.occurrence ?? 1);
                let startIndex = 0;
                let foundIndex = -1;
                for (let i = 0; i < occurrence; i++) {
                    foundIndex = text.indexOf(args.searchString, startIndex);
                    if (foundIndex === -1) {
                        break;
                    }
                    startIndex = foundIndex + args.searchString.length;
                }
                if (foundIndex >= 0) {
                    target = doc.positionAt(foundIndex);
                }
            }
            if (!target && typeof tag === 'string') {
                const text = doc.getText();
                const idx = text.indexOf(tag);
                if (idx >= 0) {
                    target = doc.positionAt(idx);
                }
            }
            if (!target) {
                result = { moved: false, reason: 'Position not found', via: args?.position ? 'position' : (tag ? 'tag' : 'search') };
                break;
            }
            const selection = new vscode.Selection(target, target);
            editor.selection = selection;
            editor.revealRange(new vscode.Range(target, target), vscode.TextEditorRevealType.Default);
            result = {
                moved: true,
                via: args?.position ? 'position' : (tag ? 'tag' : 'search'),
                position: { line: target.line, character: target.character }
            };
            break;
        }

        case "get_cursor_position": {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                result = { error: 'No active editor' };
                break;
            }
            const pos = editor.selection.active;
            result = {
                uri: editor.document.uri.toString(),
                fileName: editor.document.uri.fsPath,
                position: { line: pos.line, character: pos.character }
            };
            break;
        }

        case "read_file_safe": {
            const doc = await getLiveDocument(uri);
            result = {
                uri: uri.toString(),
                languageId: doc.languageId,
                content: doc.getText()
            };
            break;
        }

        case "read_range": {
            const rangeArg = args?.range;
            if (!rangeArg) {
                throw new Error('range is required for read_range');
            }
            const doc = await getLiveDocument(uri);
            const start = createVscodePosition(rangeArg.start.line, rangeArg.start.character);
            const end = createVscodePosition(rangeArg.end.line, rangeArg.end.character);
            if (!start || !end) {
                throw new Error('Invalid range');
            }
            const selection = new vscode.Range(start, end);
            const content = doc.getText(selection);
            result = {
                uri: uri.toString(),
                languageId: doc.languageId,
                range: {
                    start: { line: selection.start.line, character: selection.start.character },
                    end: { line: selection.end.line, character: selection.end.character }
                },
                content
            };
            break;
        }

        case "apply_patch_review": {
            const patch = args?.patch;
            if (!patch) {
                throw new Error('patch is required for apply_patch_review');
            }
            if (!(await confirmIfNeeded('Apply patch to file?', uri))) {
                result = { queued: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const res = await queuePatch(uri, patch);
            if (!res.success) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to queue patch: ${res.error}`
                    }],
                    isError: true
                };
            }
            result = { queued: true };
            break;
        }

        case "insert_lines": {
            const line = args?.line;
            const linesToInsert: string[] = args?.lines ?? [];
            if (line === undefined || !Array.isArray(linesToInsert)) {
                throw new Error('line and lines are required for insert_lines');
            }
            if (!(await confirmIfNeeded('Insert lines into file?', uri))) {
                result = { applied: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const { applied, description, patch } = await applyLineEdit(uri, (lines) => {
                const safeLine = Math.max(0, Math.min(lines.length, line));
                const next = [...lines];
                next.splice(safeLine, 0, ...linesToInsert);
                return { next, description: `Inserted ${linesToInsert.length} line(s) at ${safeLine}` };
            });
            result = { applied, patch, description };
            break;
        }

        case "remove_lines": {
            const startLine = args?.startLine;
            const endLine = args?.endLine;
            if (startLine === undefined || endLine === undefined) {
                throw new Error('startLine and endLine are required for remove_lines');
            }
            if (!(await confirmIfNeeded('Remove lines from file?', uri))) {
                result = { applied: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const { applied, description, patch } = await applyLineEdit(uri, (lines) => {
                const start = Math.max(0, Math.min(lines.length, startLine));
                const end = Math.max(start, Math.min(lines.length, endLine));
                const next = [...lines];
                next.splice(start, end - start);
                return { next, description: `Removed lines ${start}-${end}` };
            });
            result = { applied, patch, description };
            break;
        }

        case "replace_lines": {
            const startLine = args?.startLine;
            const endLine = args?.endLine;
            const replacement: string[] = args?.lines ?? [];
            if (startLine === undefined || endLine === undefined || !Array.isArray(replacement)) {
                throw new Error('startLine, endLine, and lines are required for replace_lines');
            }
            if (!(await confirmIfNeeded('Replace lines in file?', uri))) {
                result = { applied: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const { applied, description, patch } = await applyLineEdit(uri, (lines) => {
                const start = Math.max(0, Math.min(lines.length, startLine));
                const end = Math.max(start, Math.min(lines.length, endLine));
                const next = [...lines];
                next.splice(start, end - start, ...replacement);
                return { next, description: `Replaced lines ${start}-${end} with ${replacement.length} line(s)` };
            });
            result = { applied, patch, description };
            break;
        }

        case "list_files_paginated": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) {
                result = [];
                break;
            }
            const page = Math.max(1, args?.page ?? 1);
            const pageSize = Math.max(1, args?.pageSize ?? 100);
            const include = args?.glob ?? '**/*';
            const exclude = args?.exclude;
            const all = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, include),
                exclude,
                page * pageSize
            );
            const slice = all.slice((page - 1) * pageSize, page * pageSize);
            result = slice.map(u => ({
                uri: u.toString(),
                path: vscode.workspace.asRelativePath(u)
            }));
            break;
        }

        case "get_workspace_tree": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) {
                result = [];
                break;
            }
            const maxEntries = Math.max(1, args?.maxEntries ?? 200);
            const visible = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), '**', maxEntries);
            // attempt to include ignored by fetching without exclude; if exceeds, cap
            const all = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), undefined, maxEntries * 2);
            const visibleSet = new Set(visible.map(u => u.toString()));
            const combined = [...new Map(all.map(u => [u.toString(), u])).values()].slice(0, maxEntries);
            const tree: any = {};
            for (const uri of combined) {
                const rel = vscode.workspace.asRelativePath(uri);
                const segments = rel.split(/[\\/]/);
                let cursor = tree;
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    if (!cursor[seg]) {
                        cursor[seg] = { __children: {}, __info: { path: segments.slice(0, i + 1).join('/'), ignored: !visibleSet.has(uri.toString()) } };
                    }
                    cursor = cursor[seg].__children;
                }
            }
            const serialize = (node: any): any[] => {
                return Object.entries(node).map(([name, value]: [string, any]) => ({
                    name,
                    path: value.__info.path,
                    ignored: value.__info.ignored,
                    children: serialize(value.__children)
                }));
            };
            result = serialize(tree);
            break;
        }

        case "copy_file": {
            const source = args?.source ? vscode.Uri.parse(args.source) : undefined;
            const destination = args?.destination ? vscode.Uri.parse(args.destination) : undefined;
            if (!source || !destination) {
                throw new Error('source and destination are required for copy_file');
            }
            await saveIfOpen(source);
            await vscode.workspace.fs.copy(source, destination, { overwrite: true });
            result = { copied: true, source: source.toString(), destination: destination.toString() };
            break;
        }

        case "move_file": {
            const source = args?.source ? vscode.Uri.parse(args.source) : undefined;
            const destination = args?.destination ? vscode.Uri.parse(args.destination) : undefined;
            if (!source || !destination) {
                throw new Error('source and destination are required for move_file');
            }
            if (!(await confirmIfNeeded(`Move ${path.basename(source.fsPath)} to ${vscode.workspace.asRelativePath(destination)}?`, source))) {
                result = { moved: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            await saveIfOpen(source);
            await vscode.workspace.fs.rename(source, destination, { overwrite: true });
            result = { moved: true, source: source.toString(), destination: destination.toString() };
            break;
        }

        case "delete_file": {
            const target = args?.uri ? vscode.Uri.parse(args.uri) : undefined;
            if (!target) {
                throw new Error('uri is required for delete_file');
            }
            if (!(await confirmIfNeeded(`Delete ${vscode.workspace.asRelativePath(target)}?`, target))) {
                result = { deleted: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            await saveIfOpen(target);
            const useTrash = process.env.BIFROST_AUTO_APPROVE === '1' ? false : true;
            await vscode.workspace.fs.delete(target, { recursive: false, useTrash });
            result = { deleted: true, uri: target.toString() };
            break;
        }

        case "prompt_user_choice": {
            const message = args?.message;
            const choices: string[] = args?.choices;
            if (!message || !Array.isArray(choices) || choices.length === 0) {
                throw new Error('message and choices are required for prompt_user_choice');
            }
            const selection = await vscode.window.showInformationMessage(message, ...choices);
            result = { selection };
            break;
        }

        case "list_tests": {
            const tasks = await fetchTestTasks();
            result = tasks.map(t => ({
                name: t.name,
                source: t.source?.toString?.() ?? t.source,
                detail: t.detail
            }));
            break;
        }

        case "run_test": {
            const name = args?.name;
            if (!name) {
                throw new Error('name is required for run_test');
            }
            if (!(await confirmIfNeeded(`Run test task "${name}"?`))) {
                result = { started: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const tasks = await fetchTestTasks();
            const task = tasks.find(t => t.name === name);
            if (!task) {
                result = { started: false, error: 'Task not found' };
                break;
            }
            const outcome = await executeTaskAndWait(task);
            lastTestResults = [outcome];
            result = { started: true, ...outcome };
            break;
        }

        case "run_all_tests": {
            if (!(await confirmIfNeeded('Run all test tasks?'))) {
                result = { started: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const tasks = await fetchTestTasks();
            const results: { name: string; exitCode: number | null }[] = [];
            for (const task of tasks) {
                const outcome = await executeTaskAndWait(task);
                results.push(outcome);
            }
            lastTestResults = results;
            result = results;
            break;
        }

        case "get_last_test_results": {
            result = lastTestResults;
            break;
        }

        case "list_run_configurations": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            result = folder ? await listRunConfigurations(folder) : [];
            break;
        }

        case "add_run_configuration": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) {
                result = { added: false, reason: 'No workspace folder' };
                break;
            }
            const config = args?.configuration;
            if (!config?.name) {
                throw new Error('configuration with name is required');
            }
            const configs = await listRunConfigurations(folder);
            configs.push(config);
            await saveRunConfigurations(folder, configs);
            result = { added: true, name: config.name };
            break;
        }

        case "update_run_configuration": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) {
                result = { updated: false, reason: 'No workspace folder' };
                break;
            }
            const name = args?.name;
            const partial = args?.configuration ?? {};
            if (!name) {
                throw new Error('name is required');
            }
            const configs = await listRunConfigurations(folder);
            const idx = configs.findIndex(c => c.name === name);
            if (idx === -1) {
                result = { updated: false, reason: 'Not found' };
                break;
            }
            configs[idx] = { ...configs[idx], ...partial };
            await saveRunConfigurations(folder, configs);
            result = { updated: true, name };
            break;
        }

        case "delete_run_configuration": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) {
                result = { deleted: false, reason: 'No workspace folder' };
                break;
            }
            const name = args?.name;
            if (!name) {
                throw new Error('name is required');
            }
            const configs = await listRunConfigurations(folder);
            const filtered = configs.filter(c => c.name !== name);
            await saveRunConfigurations(folder, filtered);
            result = { deleted: configs.length !== filtered.length, name };
            break;
        }

        case "start_debug_configuration": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            const name = args?.name;
            if (!name) throw new Error('name is required');
            if (!(await confirmIfNeeded(`Start debug configuration "${name}"?`))) {
                result = { started: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const ok = await vscode.debug.startDebugging(folder, name);
            result = { started: ok };
            break;
        }

        case "start_no_debug_configuration": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            const name = args?.name;
            if (!name) throw new Error('name is required');
            if (!(await confirmIfNeeded(`Start without debugging "${name}"?`))) {
                result = { started: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const ok = await vscode.debug.startDebugging(folder, name, { noDebug: true });
            result = { started: ok };
            break;
        }

        case "list_build_tasks": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            result = folder ? await listBuildTasks(folder) : [];
            break;
        }

        case "add_build_task": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) { result = { added: false, reason: 'No workspace folder' }; break; }
            const task = args?.task;
            if (!task?.label) throw new Error('task with label is required');
            const tasks = await listBuildTasks(folder);
            tasks.push(task);
            await saveBuildTasks(folder, tasks);
            result = { added: true, label: task.label };
            break;
        }

        case "update_build_task": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) { result = { updated: false, reason: 'No workspace folder' }; break; }
            const label = args?.label;
            const partial = args?.task ?? {};
            if (!label) throw new Error('label is required');
            const tasks = await listBuildTasks(folder);
            const idx = tasks.findIndex(t => t.label === label);
            if (idx === -1) { result = { updated: false, reason: 'Not found' }; break; }
            tasks[idx] = { ...tasks[idx], ...partial };
            await saveBuildTasks(folder, tasks);
            result = { updated: true, label };
            break;
        }

        case "remove_build_task": {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (!folder) { result = { removed: false, reason: 'No workspace folder' }; break; }
            const label = args?.label;
            if (!label) throw new Error('label is required');
            const tasks = await listBuildTasks(folder);
            const filtered = tasks.filter(t => t.label !== label);
            await saveBuildTasks(folder, filtered);
            result = { removed: tasks.length !== filtered.length, label };
            break;
        }

        case "run_build_task": {
            const label = args?.label;
            if (!label) throw new Error('label is required');
            if (!(await confirmIfNeeded(`Run build task "${label}"?`))) {
                result = { started: false, userRejected: true, reason: 'User cancelled' };
                break;
            }
            const tasks = await vscode.tasks.fetchTasks();
            const task = tasks.find(t => t.name === label || t.detail === label || t.definition?.label === label || t.source === label);
            if (!task) { result = { started: false, reason: 'Task not found' }; break; }
            const exec = await vscode.tasks.executeTask(task);
            const finished = await new Promise<{ exitCode: number | null }>(resolve => {
                const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                    if (e.execution === exec) {
                        disposable.dispose();
                        resolve({ exitCode: e.exitCode ?? null });
                    }
                });
            });
            result = { started: true, label, exitCode: finished.exitCode };
            break;
        }

        case "debug_step_over":
            await vscode.commands.executeCommand('workbench.action.debug.stepOver'); result = { ok: true }; break;
        case "debug_step_into":
            await vscode.commands.executeCommand('workbench.action.debug.stepInto'); result = { ok: true }; break;
        case "debug_step_out":
            await vscode.commands.executeCommand('workbench.action.debug.stepOut'); result = { ok: true }; break;
        case "debug_continue":
            await vscode.commands.executeCommand('workbench.action.debug.continue'); result = { ok: true }; break;
        case "debug_status": {
            const activeSession = vscode.debug.activeDebugSession;
            const sessions: vscode.DebugSession[] = (vscode.debug as any).sessions ?? [];
            const sessionsInfo = sessions.map((session: vscode.DebugSession) => ({
                id: session.id,
                name: session.name,
                type: session.type
            }));
            result = {
                hasActiveSession: Boolean(activeSession),
                activeSession: activeSession ? { id: activeSession.id, name: activeSession.name, type: activeSession.type } : null,
                sessions: sessionsInfo,
                notRunning: !activeSession
            };
            break;
        }
        case "debug_stop": {
            const session = vscode.debug.activeDebugSession;
            if (!session) {
                result = { stopped: false, reason: 'No active debug session', notRunning: true, error: 'No active debug session' };
                break;
            }
            const stopped = await vscode.debug.stopDebugging(session);
            result = { stopped: Boolean(stopped), notRunning: false };
            break;
        }

        case "debug_add_watch": {
            const expr = args?.expression;
            if (!expr) throw new Error('expression is required');
            result = { watches: addWatch(expr) };
            break;
        }
        case "debug_list_watches":
            result = { watches: listWatches() }; break;
        case "debug_remove_watch":
            result = { watches: removeWatch(args?.expression) }; break;
        case "debug_watch_values":
            if (!vscode.debug.activeDebugSession) {
                result = { notRunning: true, error: 'No active debug session' };
                break;
            }
            result = await evaluateWatches();
            break;
        case "debug_get_locals":
            if (!vscode.debug.activeDebugSession) {
                result = { notRunning: true, error: 'No active debug session' };
                break;
            }
            result = await getLocals();
            break;
        case "debug_get_call_stack":
            if (!vscode.debug.activeDebugSession) {
                result = { notRunning: true, error: 'No active debug session' };
                break;
            }
            result = await getCallStack();
            break;

        case "debug_add_breakpoint": {
            const functionName: string | undefined = args?.functionName;
            const uriArg: string | undefined = args?.uri;
            const line: number | undefined = args?.line;
            const condition: string | undefined = args?.condition;
            const logMessage: string | undefined = args?.logMessage;
            const bps: vscode.Breakpoint[] = [];
            if (functionName) {
                bps.push(new vscode.FunctionBreakpoint(functionName, true, condition));
            } else if (uriArg !== undefined && line !== undefined) {
                const fileUri = vscode.Uri.parse(uriArg);
                const loc = new vscode.Location(fileUri, new vscode.Position(line, 0));
                const bp = new vscode.SourceBreakpoint(loc, true, condition, logMessage);
                bps.push(bp);
            } else {
                throw new Error('Provide functionName or uri+line for breakpoint');
            }
            vscode.debug.addBreakpoints(bps);
            result = { added: bps.length };
            break;
        }

        case "debug_remove_breakpoint": {
            const uriArg: string | undefined = args?.uri;
            const line: number | undefined = args?.line;
            const functionName: string | undefined = args?.functionName;
            const bps = vscode.debug.breakpoints.filter(bp => {
                if (functionName && bp instanceof vscode.FunctionBreakpoint) {
                    return bp.functionName === functionName;
                }
                if (bp instanceof vscode.SourceBreakpoint && uriArg !== undefined && line !== undefined) {
                    return bp.location.uri.toString() === uriArg && bp.location.range.start.line === line;
                }
                return false;
            });
            if (bps.length) {
                vscode.debug.removeBreakpoints(bps);
            }
            result = { removed: bps.length };
            break;
        }

        case "debug_disable_all_breakpoints": {
            const disabled = vscode.debug.breakpoints.map(bp => {
                if (bp instanceof vscode.SourceBreakpoint) {
                    return new vscode.SourceBreakpoint(bp.location, false, bp.condition, (bp as any).logMessage);
                }
                if (bp instanceof vscode.FunctionBreakpoint) {
                    return new vscode.FunctionBreakpoint(bp.functionName, false, bp.condition);
                }
                return bp;
            });
            vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
            vscode.debug.addBreakpoints(disabled);
            result = { disabled: disabled.length };
            break;
        }

        case "debug_remove_all_breakpoints": {
            const count = vscode.debug.breakpoints.length;
            vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
            result = { removed: count };
            break;
        }

        case "list_formatters": {
            const document = await vscode.workspace.openTextDocument(uri);
            const languageId = document.languageId;
            const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
            const defaultFormatter = editorConfig.get<string>('defaultFormatter');

            const seen = new Set<string>();
            const formatters = vscode.extensions.all
                .map(ext => {
                    const pkg = ext.packageJSON as any;
                    const contributes = pkg?.contributes;
                    const supportsLanguage = Array.isArray(contributes?.languages) &&
                        contributes.languages.some((lang: any) => lang?.id === languageId);
                    const activationEvents: string[] = Array.isArray(pkg?.activationEvents) ? pkg.activationEvents : [];
                    const activatesOnLanguage = activationEvents.some(ev => ev === `onLanguage:${languageId}`);

                    if (!supportsLanguage && !activatesOnLanguage) {
                        return null;
                    }

                    if (seen.has(ext.id)) {
                        return null;
                    }
                    seen.add(ext.id);

                    return {
                        id: ext.id,
                        displayName: pkg?.displayName || pkg?.name || ext.id,
                        description: pkg?.description,
                        isDefault: ext.id === defaultFormatter
                    };
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .sort((a, b) => {
                    if (a.isDefault && !b.isDefault) return -1;
                    if (!a.isDefault && b.isDefault) return 1;
                    return a.displayName.localeCompare(b.displayName);
                });

            result = {
                languageId,
                defaultFormatter,
                formatters
            };
            break;
        }

        case "format_document": {
            const document = await vscode.workspace.openTextDocument(uri);
            const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
            const desiredFormatter: string | undefined = args?.formatterId;

            const formattingOptions: vscode.FormattingOptions = {
                tabSize: typeof args?.options?.tabSize === 'number'
                    ? args.options.tabSize
                    : editorConfig.get<number>('tabSize', 4),
                insertSpaces: typeof args?.options?.insertSpaces === 'boolean'
                    ? args.options.insertSpaces
                    : editorConfig.get<boolean>('insertSpaces', true)
            };

            let range: vscode.Range | undefined;
            if (args?.range) {
                const start = createVscodePosition(args.range.start.line, args.range.start.character);
                const end = createVscodePosition(args.range.end.line, args.range.end.character);
                if (start && end) {
                    range = new vscode.Range(start, end);
                }
            }

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            const configTarget = workspaceFolder
                ? vscode.ConfigurationTarget.WorkspaceFolder
                : (vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global);
            const previousFormatter = editorConfig.get<string>('defaultFormatter');
            let formatterChanged = false;
            let formatterUsed = desiredFormatter || previousFormatter || 'default';

            try {
                if (desiredFormatter && desiredFormatter !== previousFormatter) {
                    try {
                        await editorConfig.update('defaultFormatter', desiredFormatter, configTarget);
                        formatterChanged = true;
                    } catch (error) {
                        formatterUsed = previousFormatter || 'default';
                    }
                } else {
                    formatterUsed = previousFormatter || 'default';
                }

                const edits = range
                    ? await vscode.commands.executeCommand<vscode.TextEdit[]>(
                        'vscode.executeFormatRangeProvider',
                        document.uri,
                        range,
                        formattingOptions
                    )
                    : await vscode.commands.executeCommand<vscode.TextEdit[]>(
                        'vscode.executeFormatDocumentProvider',
                        document.uri,
                        formattingOptions
                    );

                if (!edits || edits.length === 0) {
                    result = {
                        formatted: false,
                        formatterUsed,
                        message: "No formatting edits were produced"
                    };
                    break;
                }

                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.set(document.uri, edits);
                const success = await vscode.workspace.applyEdit(workspaceEdit);

                result = {
                    formatted: success,
                    formatterUsed,
                    editsApplied: edits.length,
                    rangeFormatted: Boolean(range)
                };
            } finally {
                if (formatterChanged) {
                    await editorConfig.update('defaultFormatter', previousFormatter, configTarget);
                }
            }
            break;
        }
    
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
    return result;
}
