import * as vscode from "vscode";
import { FsWrapper, FsNull } from "./fs-wrapper";
import { getOptionsDefault, getOptionsOverride, getNoImport } from "./config";

export async function markdownlintWrapper(document: vscode.TextDocument) {
  // Placeholder implementation for migration scaffold. In the final rewrite,
  // this will call markdownlint-cli2 with the correct parameters.
  const scheme = document.uri.scheme;
  const independentDocument = scheme !== "file" && scheme !== "vscode-vfs" && scheme !== "vscode-test-web" && scheme !== "gist";
  const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri)?.uri ?? vscode.Uri.joinPath(document.uri, "..");
  const fs = independentDocument ? new FsNull() : new FsWrapper(workspaceFolderUri!);
  const configuration = vscode.workspace.getConfiguration("markdownlint", document.uri);
  const config = await getOptionsDefault(fs, configuration);
  // Return empty results for now
  return {
    results: [],
    errorSeverity: vscode.DiagnosticSeverity.Warning,
    warningSeverity: vscode.DiagnosticSeverity.Information
  };
}
