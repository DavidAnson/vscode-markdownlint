import * as vscode from "vscode";
import stringifyError from "./stringify-error";
import { FsWrapper, FsNull } from "./fs-wrapper";
import { markdownlintWrapper } from "./lint-runner";
import { resultsToDiagnostics } from "./diagnostics";
import { openConfigFile, toggleLinting } from "./commands";

const extensionDisplayName = "markdownlint";

const clickForInfo = "More information about ";
const clickToFixThis = "Fix this violation of ";
const clickToFixRulePrefix = "Fix all violations of ";
const inTheDocument = " in the document";
const fixAllCommandTitle = `Fix all supported markdownlint violations in the document`;
const fixAllCommandName = "markdownlint.fixAll";
const openCommand = "vscode.open";
const clickForConfigureInfo = `Details about configuring markdownlint rules`;
const clickForConfigureUrl = "https://github.com/DavidAnson/vscode-markdownlint#configure";

const codeActionKindQuickFix = vscode.CodeActionKind.QuickFix;
const codeActionKindSourceFixAllExtension = vscode.CodeActionKind.SourceFixAll.append(extensionDisplayName);

/** @type {Record<string, vscode.Uri | undefined>} */
const ruleNameToInformationUri: Record<string, vscode.Uri | undefined> = {};

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
      const { diagnostics, ruleNameToInformationUri: mapping } = resultsToDiagnostics(results, document);
      // Merge mapping
      Object.assign(ruleNameToInformationUri, mapping);
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

    // Register CodeActionsProvider
    const documentSelector = { language: "markdown" };
    const codeActionProvider = {
      provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext) {
        const codeActions: vscode.CodeAction[] = [];
        const addToCodeActions = (action: vscode.CodeAction) => {
          if (!context.only || context.only.contains(action.kind)) {
            codeActions.push(action);
          }
        };
        const extensionDiagnostics = context.diagnostics.filter((d) => d.source === extensionDisplayName);
        for (const diagnostic of extensionDiagnostics) {
          // @ts-ignore
          const fixInfo = diagnostic.fixInfo;
          const ruleName = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
          const ruleNameAlias = diagnostic.message.split(":")[0];
          if (fixInfo) {
            const fixTitle = clickToFixThis + ruleNameAlias;
            const fixAction = new vscode.CodeAction(fixTitle, codeActionKindQuickFix);
            fixAction.command = { title: fixTitle, command: "markdownlint.fixLine", arguments: [ diagnostic.range.start.line, fixInfo ] };
            fixAction.diagnostics = [diagnostic];
            fixAction.isPreferred = true;
            addToCodeActions(fixAction);
          }
          const ruleInformationUri = ruleNameToInformationUri[ruleName as string];
          if (ruleInformationUri) {
            const infoTitle = clickForInfo + ruleNameAlias;
            const infoAction = new vscode.CodeAction(infoTitle, codeActionKindQuickFix);
            infoAction.command = { title: infoTitle, command: openCommand, arguments: [ruleInformationUri] };
            addToCodeActions(infoAction);
          }
          if (fixInfo) {
            const fixTitle = clickToFixRulePrefix + ruleNameAlias + inTheDocument;
            const fixAction = new vscode.CodeAction(fixTitle, codeActionKindQuickFix);
            fixAction.command = { title: fixTitle, command: "markdownlint.fixAll", arguments: [ ruleName ] };
            addToCodeActions(fixAction);
          }
        }
        if (extensionDiagnostics.length > 0) {
          const sourceFixAllAction = new vscode.CodeAction(fixAllCommandTitle, codeActionKindSourceFixAllExtension);
          sourceFixAllAction.command = { title: fixAllCommandTitle, command: fixAllCommandName };
          addToCodeActions(sourceFixAllAction);
          const configureInfoAction = new vscode.CodeAction(clickForConfigureInfo, codeActionKindQuickFix);
          configureInfoAction.command = { title: clickForConfigureInfo, command: openCommand, arguments: [ vscode.Uri.parse(clickForConfigureUrl) ] };
          addToCodeActions(configureInfoAction);
        }
        return codeActions;
      }
    };
    const codeActionProviderMetadata = {
      providedCodeActionKinds: [ codeActionKindQuickFix, codeActionKindSourceFixAllExtension ]
    };
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(documentSelector, codeActionProvider, codeActionProviderMetadata));

    // Register fix commands by dynamically importing fixes module
    import("./fixes").then(({ fixAll, fixLine }) => {
      context.subscriptions.push(
        vscode.commands.registerCommand(fixAllCommandName, (ruleName?: string) => fixAll(ruleName)),
        vscode.commands.registerCommand("markdownlint.fixLine", (line: number, fixInfo: any) => fixLine(line, fixInfo))
      );
    }).catch((err) => outputLine(stringifyError(err), true));

  // Initial lint of visible editors
  setTimeout(() => {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId === "markdown") {
        // Invoke lint runner (non-blocking)
        markdownlintWrapper(editor.document).then(({ results }) => {
          const { diagnostics, ruleNameToInformationUri: mapping } = resultsToDiagnostics(results, editor.document);
          Object.assign(ruleNameToInformationUri, mapping);
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
