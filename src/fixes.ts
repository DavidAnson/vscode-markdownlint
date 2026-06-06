import * as vscode from "vscode";
import stringifyError from "./stringify-error";
import { markdownlintWrapper } from "./lint-runner";

export async function fixLine(lineIndex: number, fixInfo: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !fixInfo) return;
  const document = editor.document;
  const lineNumber = fixInfo.lineNumber || (lineIndex + 1);
  const { text, range } = document.lineAt(lineNumber - 1);
  try {
    const mod = await import("markdownlint-cli2/markdownlint");
    const { applyFix } = mod as any;
    const fixedText = applyFix(text, fixInfo, "\n");
    await editor.edit((editBuilder) => {
      if (typeof fixedText === "string") {
        editBuilder.replace(range, fixedText);
      } else {
        let deleteRange = range;
        if (lineNumber === 1) {
          if (document.lineCount > 1) {
            const nextLine = document.lineAt(range.end.line + 1);
            deleteRange = range.with({ end: nextLine.range.start });
          }
        } else {
          const previousLine = document.lineAt(range.start.line - 1);
          deleteRange = range.with({ start: previousLine.range.end });
        }
        editBuilder.delete(deleteRange);
      }
    });
    // Restore cursor
    const cursorPosition = editor.selection.active;
    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
  } catch (err) {
    vscode.window.showErrorMessage("Error applying fix: " + stringifyError(err));
  }
}

export async function fixAll(ruleNameFilter?: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  try {
    const { results } = await markdownlintWrapper(document);
    const errorsToFix = results.filter((e: any) => (!ruleNameFilter || (e.ruleNames && e.ruleNames[0] === ruleNameFilter)));
    const mod = await import("markdownlint-cli2/markdownlint");
    const { applyFixes } = mod as any;
    const text = document.getText();
    const fixedText = applyFixes(text, errorsToFix);
    if (text !== fixedText) {
      await editor.edit((editBuilder) => {
        const start = document.lineAt(0).range.start;
        const end = document.lineAt(document.lineCount - 1).range.end;
        editBuilder.replace(new vscode.Range(start, end), fixedText);
      });
    }
  } catch (err) {
    vscode.window.showErrorMessage("Error applying fixes: " + stringifyError(err));
  }
}

export async function formatDocument(document: vscode.TextDocument, range: vscode.Range) {
  if (document.languageId !== "markdown") return [] as vscode.TextEdit[];
  try {
    const { results } = await markdownlintWrapper(document);
    const rangeErrors = results.filter((error: any) => {
      const { fixInfo } = error;
      if (fixInfo) {
        const line = error.lineNumber - 1;
        return (range.start.line <= line) && (line <= range.end.line);
      }
      return false;
    });
    const mod = await import("markdownlint-cli2/markdownlint");
    const { applyFixes } = mod as any;
    const text = document.getText();
    const fixedText = applyFixes(text, rangeErrors);
    const start = document.lineAt(0).range.start;
    const end = document.lineAt(document.lineCount - 1).range.end;
    return (text === fixedText) ? [] : [vscode.TextEdit.replace(new vscode.Range(start, end), fixedText)];
  } catch (err) {
    vscode.window.showErrorMessage("Error formatting document: " + stringifyError(err));
    return [];
  }
}
