import * as vscode from 'vscode';
import * as path from 'path';

const getOpenDocText = (uri: vscode.Uri): string | undefined => {
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    return doc?.getText();
};

async function readJsonFile<T>(folder: vscode.WorkspaceFolder, relativePath: string, fallback: T): Promise<T> {
    const target = vscode.Uri.joinPath(folder.uri, relativePath);
    try {
        const openText = getOpenDocText(target);
        const content = openText !== undefined ? openText : Buffer.from(await vscode.workspace.fs.readFile(target)).toString('utf8');
        return JSON.parse(content);
    } catch {
        return fallback;
    }
}

async function writeJsonFile(folder: vscode.WorkspaceFolder, relativePath: string, data: any): Promise<void> {
    const target = vscode.Uri.joinPath(folder.uri, relativePath);
    const json = JSON.stringify(data, null, 4);
    const dir = path.posix.dirname(relativePath);
    if (dir && dir !== '.') {
        const dirUri = vscode.Uri.joinPath(folder.uri, dir);
        await vscode.workspace.fs.createDirectory(dirUri);
    }
    const openDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === target.toString());
    if (openDoc) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(openDoc.positionAt(0), openDoc.positionAt(openDoc.getText().length));
        edit.replace(target, fullRange, json);
        await vscode.workspace.applyEdit(edit);
        if (!openDoc.isDirty) {
            await openDoc.save();
        }
    } else {
        await vscode.workspace.fs.writeFile(target, Buffer.from(json, 'utf8'));
    }
}

export interface RunConfiguration {
    name: string;
    [key: string]: any;
}

export interface TaskDefinition {
    label?: string;
    type: string;
    [key: string]: any;
}

export async function listRunConfigurations(folder: vscode.WorkspaceFolder): Promise<RunConfiguration[]> {
    const launch = await readJsonFile(folder, '.vscode/launch.json', { configurations: [] as RunConfiguration[] });
    return Array.isArray(launch.configurations) ? launch.configurations : [];
}

export async function saveRunConfigurations(folder: vscode.WorkspaceFolder, configurations: RunConfiguration[]): Promise<void> {
    const launch = await readJsonFile(folder, '.vscode/launch.json', { version: '0.2.0', configurations: [] as RunConfiguration[] });
    launch.configurations = configurations;
    await writeJsonFile(folder, '.vscode/launch.json', launch);
}

export async function listBuildTasks(folder: vscode.WorkspaceFolder): Promise<TaskDefinition[]> {
    const tasks = await readJsonFile(folder, '.vscode/tasks.json', { tasks: [] as TaskDefinition[] });
    return Array.isArray(tasks.tasks) ? tasks.tasks : [];
}

export async function saveBuildTasks(folder: vscode.WorkspaceFolder, tasksList: TaskDefinition[]): Promise<void> {
    const tasks = await readJsonFile(folder, '.vscode/tasks.json', { version: '2.0.0', tasks: [] as TaskDefinition[] });
    tasks.tasks = tasksList;
    await writeJsonFile(folder, '.vscode/tasks.json', tasks);
}
