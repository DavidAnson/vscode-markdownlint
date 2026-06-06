import * as vscode from "vscode";

export async function openConfigFile() {
  const workspaceFolderUris = (vscode.workspace.workspaceFolders || []).map((f) => f.uri);
  for (const workspaceFolderUri of workspaceFolderUris) {
    const fileUri = vscode.Uri.joinPath(workspaceFolderUri, ".markdownlint.json");
    const untitled = fileUri.with({ scheme: "untitled" });
    await vscode.window.showTextDocument(untitled);
  }
}

export function toggleLinting() {
  // Placeholder for toggle; concrete state managed by extension activation
  vscode.window.showInformationMessage("Toggled markdownlint (placeholder)");
}
