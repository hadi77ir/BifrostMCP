import * as vscode from 'vscode';

const STORAGE_KEY = 'bifrost-auto-approve';
let autoApprove = false;
let statusItem: vscode.StatusBarItem | undefined;

export function initializeModeSwitch(context: vscode.ExtensionContext) {
    autoApprove = context.globalState.get<boolean>(STORAGE_KEY, false);
    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    statusItem.command = 'bifrost-mcp.toggleAutoApprove';
    context.subscriptions.push(statusItem);

    const update = () => {
        if (!statusItem) return;
        statusItem.text = autoApprove ? '$(shield) Tool Auto-Approve' : '$(question) Tool Confirm';
        statusItem.tooltip = autoApprove
            ? 'Auto-approve risky tool actions (click to require confirmation)'
            : 'Require confirmation for risky tool actions (click to auto-approve)';
        statusItem.show();
    };

    update();

    context.subscriptions.push(
        vscode.commands.registerCommand('bifrost-mcp.toggleAutoApprove', async () => {
            autoApprove = !autoApprove;
            await context.globalState.update(STORAGE_KEY, autoApprove);
            update();
            vscode.window.showInformationMessage(`Tool confirmation mode: ${autoApprove ? 'Auto-approve' : 'Ask'}`);
        })
    );
}

export function isAutoApprove(): boolean {
    return autoApprove;
}
