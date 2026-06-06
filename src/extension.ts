import * as vscode from "vscode";
import stringifyError from "./stringify-error";
import { FsWrapper, FsNull } from "./fs-wrapper";

const extensionDisplayName = "markdownlint";

let outputChannel: vscode.OutputChannel | null = null;
let diagnosticCollection: vscode.DiagnosticCollection | null = null;

function outputLine(message: string, isError = false) {
  if (!outputChannel) return;
  const time = new Date().toLocaleTimeString();
  const importance = isError ? "ERROR" : "INFO";
  outputChannel.appendLine(`[${time}] ${importance}: ${message}`);
  if (isError) {
    outputChannel.show(true);
  }
}

async function lintWorkspace() {
  outputLine("Lint workspace (simplified) -> starting");
  // This simplified implementation just iterates workspace folders and logs them
  const folders = vscode.workspace.workspaceFolders || [];
  for (const folder of folders) {
    outputLine(`Linting ${folder.uri.toString()}`);
    // In the full rewrite, invoke markdownlint-cli2 with FsWrapper
  }
  outputLine("Lint workspace (simplified) -> complete");
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
  context.subscriptions.push(outputChannel);

  diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionDisplayName);
  context.subscriptions.push(diagnosticCollection);

  // Register a lint workspace command
  context.subscriptions.push(vscode.commands.registerCommand("markdownlint.lintWorkspace", () => lintWorkspace()));

  // Add a toggle command (no-op simplified)
  context.subscriptions.push(vscode.commands.registerCommand("markdownlint.toggleLinting", () => {
    outputLine("Toggled linting (simplified)");
  }));

  // Provide a basic code action provider placeholder to keep extension surface
  const provider: vscode.CodeActionProvider = {
    provideCodeActions() {
      return [];
    }
  };
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ language: "markdown" }, provider));

  // Initial lint of visible editors
  setTimeout(() => {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId === "markdown") {
        // placeholder: in full rewrite we'd call an async lint per document
        outputLine(`Would lint: ${editor.document.uri.toString()}`);
      }
    }
  }, 500);
}

export function deactivate() {
  diagnosticCollection?.dispose();
  outputChannel?.dispose();
}
