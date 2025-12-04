import * as vscode from 'vscode';
import { applyPatch } from 'diff';

interface PendingPatch {
    uri: vscode.Uri;
    original: string;
    patched: string;
    languageId: string | undefined;
}

const pending: Map<string, PendingPatch> = new Map();
let statusItem: vscode.StatusBarItem | undefined;

export function initializeReviewStatusBar(context: vscode.ExtensionContext) {
    if (statusItem) {
        return;
    }
    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    statusItem.command = 'bifrost-mcp.openAllPatches';
    context.subscriptions.push(statusItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('bifrost-mcp.acceptAllPatches', acceptAll),
        vscode.commands.registerCommand('bifrost-mcp.rejectAllPatches', rejectAll),
        vscode.commands.registerCommand('bifrost-mcp.openAllPatches', openAll)
    );

    refreshStatus();
}

export function refreshStatus() {
    if (!statusItem) return;
    const count = pending.size;
    if (count === 0) {
        statusItem.hide();
        return;
    }
    statusItem.text = `$(diff) Pending patches: ${count}`;
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown('**Patch Review**  \n');
    markdown.appendMarkdown('[Accept All](command:bifrost-mcp.acceptAllPatches) | ');
    markdown.appendMarkdown('[Reject All](command:bifrost-mcp.rejectAllPatches) | ');
    markdown.appendMarkdown('[Open All](command:bifrost-mcp.openAllPatches)');
    markdown.isTrusted = true;
    statusItem.tooltip = markdown;
    statusItem.show();
}

export async function queuePatch(uri: vscode.Uri, patch: string): Promise<{ success: boolean; error?: string }> {
    try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const original = doc.getText();
        const patched = applyPatch(original, patch);
        if (patched === false) {
            return { success: false, error: 'Failed to apply patch' };
        }
        pending.set(uri.toString(), {
            uri,
            original,
            patched,
            languageId: doc.languageId
        });
        await openPreview(uri, original, patched, doc.languageId);
        refreshStatus();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message ?? String(error) };
    }
}

async function openPreview(uri: vscode.Uri, original: string, patched: string, languageId?: string) {
    const left = await vscode.workspace.openTextDocument(uri);
    const right = await vscode.workspace.openTextDocument({ content: patched, language: languageId });
    await vscode.commands.executeCommand(
        'vscode.diff',
        left.uri,
        right.uri,
        `Patch Preview: ${vscode.workspace.asRelativePath(uri)}`,
        { preview: false }
    );
}

export async function acceptAll() {
    for (const item of pending.values()) {
        const edit = new vscode.WorkspaceEdit();
        const doc = await vscode.workspace.openTextDocument(item.uri);
        const wasDirty = doc.isDirty;
        const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(doc.getText().length)
        );
        edit.replace(item.uri, fullRange, item.patched);
        await vscode.workspace.applyEdit(edit);
        if (!wasDirty) {
            await doc.save();
        }
    }
    pending.clear();
    refreshStatus();
}

export async function rejectAll() {
    pending.clear();
    refreshStatus();
}

export async function openAll() {
    for (const item of pending.values()) {
        await openPreview(item.uri, item.original, item.patched, item.languageId);
    }
}

export function getPendingCount() {
    return pending.size;
}
