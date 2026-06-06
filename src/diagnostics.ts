import * as vscode from "vscode";

export function resultsToDiagnostics(results: any[], document: vscode.TextDocument) {
  const diagnostics: vscode.Diagnostic[] = [];
  const ruleNameToInformationUri: Record<string, vscode.Uri | undefined> = {};
  for (const result of results) {
    const lineNumber = result.lineNumber || 1;
    const range = document.lineAt(lineNumber - 1).range;
    const ruleName = (result.ruleNames && result.ruleNames[0]) || "UNKNOWN";
    const message = (result.ruleNames || ["UNKNOWN"]).join("/") + ": " + (result.ruleDescription || "");
    const severity = (result.severity === "warning") ? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Warning;
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "markdownlint";
    // Attach fix info if present
    // @ts-ignore
    if (result.fixInfo) diagnostic.fixInfo = result.fixInfo;
    diagnostics.push(diagnostic);
    if (result.ruleInformation) {
      try {
        ruleNameToInformationUri[ruleName] = vscode.Uri.parse(result.ruleInformation);
      } catch {
        ruleNameToInformationUri[ruleName] = undefined;
      }
    }
  }
  return { diagnostics, ruleNameToInformationUri } as const;
}
