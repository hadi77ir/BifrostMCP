import * as vscode from 'vscode';

let watchExpressions: string[] = [];

export function listWatches() {
    return [...watchExpressions];
}

export function addWatch(expression: string) {
    if (!watchExpressions.includes(expression)) {
        watchExpressions.push(expression);
    }
    return listWatches();
}

export function removeWatch(expression: string) {
    watchExpressions = watchExpressions.filter(e => e !== expression);
    return listWatches();
}

export async function evaluateWatches(): Promise<{ expression: string; value?: string; error?: string }[]> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
        return watchExpressions.map(expression => ({ expression, error: 'No active debug session' }));
    }
    const frameId = await getTopFrameId(session);
    const results: { expression: string; value?: string; error?: string }[] = [];
    for (const expression of watchExpressions) {
        try {
            const resp: any = await session.customRequest('evaluate', {
                expression,
                context: 'watch',
                frameId
            });
            results.push({ expression, value: resp?.result });
        } catch (error: any) {
            results.push({ expression, error: error?.message ?? String(error) });
        }
    }
    return results;
}

export async function getLocals(): Promise<{ scopes?: any[]; error?: string }> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
        return { error: 'No active debug session' };
    }
    try {
        const frameId = await getTopFrameId(session);
        const scopes: any = await session.customRequest('scopes', { frameId });
        const locals = scopes?.scopes ?? [];
        const resolved: any[] = [];
        for (const scope of locals) {
            try {
                const vars = await session.customRequest('variables', { variablesReference: scope.variablesReference });
                resolved.push({
                    name: scope.name,
                    variables: vars?.variables ?? []
                });
            } catch {
                resolved.push({ name: scope.name, variables: [] });
            }
        }
        return { scopes: resolved };
    } catch (error: any) {
        return { error: error?.message ?? String(error) };
    }
}

export async function getCallStack(): Promise<{ frames?: any[]; error?: string }> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
        return { error: 'No active debug session' };
    }
    try {
        const threads: any = await session.customRequest('threads', {});
        const thread = threads?.threads?.[0];
        if (!thread) {
            return { error: 'No threads found' };
        }
        const stack: any = await session.customRequest('stackTrace', { threadId: thread.id, startFrame: 0, levels: 20 });
        const frames = (stack?.stackFrames ?? []).map((f: any) => ({
            name: f.name,
            line: f.line,
            column: f.column,
            source: f.source?.path ?? f.source?.name
        }));
        return { frames };
    } catch (error: any) {
        return { error: error?.message ?? String(error) };
    }
}

async function getTopFrameId(session: vscode.DebugSession): Promise<number | undefined> {
    const threads: any = await session.customRequest('threads', {});
    const thread = threads?.threads?.[0];
    if (!thread) {
        return undefined;
    }
    const stack: any = await session.customRequest('stackTrace', { threadId: thread.id, startFrame: 0, levels: 1 });
    return stack?.stackFrames?.[0]?.id;
}
