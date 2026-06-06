import * as vscode from "vscode";

export function resultsToDiagnostics(results: any[], document: vscode.TextDocument) {
  const diagnostics: vscode.Diagnostic[] = [];
  for (const result of results) {
    const lineNumber = result.lineNumber || 1;
    const range = document.lineAt(lineNumber - 1).range;
    const message = (result.ruleNames || ["UNKNOWN"]).join("/") + ": " + (result.ruleDescription || "");
    const severity = (result.severity === "warning") ? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Warning;
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "markdownlint";
    diagnostics.push(diagnostic);
  }
  return diagnostics;
}
