import * as vscode from "vscode";
import stringifyError from "./stringify-error";
import { FsWrapper, FsNull } from "./fs-wrapper";
import { markdownlintWrapper } from "./lint-runner";
import { resultsToDiagnostics } from "./diagnostics";
import { openConfigFile, toggleLinting } from "./commands";

const extensionDisplayName = "markdownlint";

let outputChannel: vscode.OutputChannel | null = null;
let diagnosticCollection: vscode.DiagnosticCollection | null = null;
let diagnosticGeneration = 0;
let runMap: Record<string, any> = {};
let lintingEnabled = true;
const throttle = { document: null as vscode.TextDocument | null, timeout: null as any };

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

function isMarkdownDocument(document: vscode.TextDocument) {
  const schemeSupported = new Set(["untitled", "file", "vscode-vfs", "vscode-test-web", "gist"]);
  return (document.languageId === "markdown") && schemeSupported.has(document.uri.scheme);
}

function suppressLint(document: vscode.TextDocument | null) {
  if (throttle.timeout && document && throttle.document === document) {
    clearTimeout(throttle.timeout);
    throttle.document = null;
    throttle.timeout = null;
  }
}

function requestLint(document: vscode.TextDocument) {
  suppressLint(document);
  throttle.document = document;
  throttle.timeout = setTimeout(() => {
    lint(document);
    suppressLint(document);
  }, 500);
}

function clearDiagnosticsAndLintVisibleFiles(eventUri?: vscode.Uri) {
  if (eventUri) outputLine(`Re-linting due to "${eventUri.fsPath}" change.`);
  diagnosticCollection?.clear();
  diagnosticGeneration++;
  lintVisibleFiles();
}

function lintVisibleFiles() {
  didChangeVisibleTextEditors(vscode.window.visibleTextEditors);
}

function getRun(document: vscode.TextDocument) {
  const name = document.uri.toString();
  if (runMap[name]) return runMap[name];
  const configuration = vscode.workspace.getConfiguration("markdownlint", document.uri);
  runMap[name] = configuration.get("run");
  outputLine(`Linting for "${name}" will be run "${runMap[name]}".`);
  return runMap[name];
}

function clearRunMap() { runMap = {}; }

async function lint(document: vscode.TextDocument) {
  if (!lintingEnabled || !isMarkdownDocument(document)) return;
  const targetGeneration = diagnosticGeneration;
  try {
    const { results } = await markdownlintWrapper(document);
    if (targetGeneration === diagnosticGeneration) {
      const diagnostics = resultsToDiagnostics(results, document);
      diagnosticCollection?.set(document.uri, diagnostics);
    }
  } catch (err) {
    outputLine(stringifyError(err), true);
  }
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
  context.subscriptions.push(outputChannel);

  diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionDisplayName);
  context.subscriptions.push(diagnosticCollection);

  // Register a lint workspace command
  context.subscriptions.push(vscode.commands.registerCommand("markdownlint.lintWorkspace", () => lintWorkspace()));
  context.subscriptions.push(vscode.commands.registerCommand("markdownlint.openConfigFile", () => openConfigFile()));
  context.subscriptions.push(vscode.commands.registerCommand("markdownlint.toggleLinting", () => toggleLinting()));

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
        // Invoke lint runner (non-blocking)
        markdownlintWrapper(editor.document).then(({ results }) => {
          const diagnostics = resultsToDiagnostics(results, editor.document);
          diagnosticCollection?.set(editor.document.uri, diagnostics);
        }).catch((err) => outputLine(stringifyError(err), true));
      }
    }
  }, 500);
}

export function deactivate() {
  diagnosticCollection?.dispose();
  outputChannel?.dispose();
}
