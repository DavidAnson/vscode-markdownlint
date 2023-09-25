"use strict";

// This must be CommonJS or the VS Code host fails with:
// Error: Cannot find package 'vscode' imported from .../tests.mjs

/* eslint-disable func-style */

const assert = require("node:assert");
const path = require("node:path");
const vscode = require("vscode");

function testWrapper (test) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("TEST TIMEOUT")), 10_000);
		const disposables = [];
		const cleanup = () => {
			clearTimeout(timeout);
			for (const disposable of disposables) {
				disposable.dispose();
			}
			vscode.commands.executeCommand("workbench.action.closeAllEditors");
		};
		const resolveWrapper = (value) => {
			resolve(value);
			cleanup();
		};
		const rejectWrapper = (reason) => {
			reject(reason);
			cleanup();
		};
		try {
			test(resolveWrapper, rejectWrapper, disposables);
		} catch (error) {
			rejectWrapper(error);
		}
	});
}

function callbackWrapper (reject, callback) {
	try {
		return callback();
	} catch (error) {
		return reject(error);
	}
}

const tests = [

	function openLintEditVerifyFixAll () {
		return testWrapper((resolve, reject, disposables) => {
			let fixedAll = false;
			disposables.push(
				vscode.window.onDidChangeActiveTextEditor((textEditor) => {
					callbackWrapper(reject, () => {
						assert.ok(textEditor.document.uri.path.endsWith("/README.md"));
						textEditor.edit((editBuilder) => {
							// MD019
							editBuilder.insert(new vscode.Position(0, 1), " ");
							// MD012
							editBuilder.insert(new vscode.Position(1, 0), "\n");
						});
					});
				}),
				vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
					callbackWrapper(reject, () => {
						const {uris} = diagnosticChangeEvent;
						assert.equal(uris.length, 1);
						const [ uri ] = uris;
						const diagnostics = vscode.languages.getDiagnostics(uri);
						if ((diagnostics.length > 0) && !fixedAll) {
							// eslint-disable-next-line array-element-newline
							const [ md019, md012 ] = diagnostics;
							// @ts-ignore
							assert.equal(md019.code.value, "MD019");
							assert.equal(
								// @ts-ignore
								md019.code.target.toString(),
								"https://github.com/DavidAnson/markdownlint/blob/v0.31.1/doc/md019.md"
							);
							assert.equal(
								md019.message,
								"MD019/no-multiple-space-atx: Multiple spaces after hash on atx style heading"
							);
							assert.ok(md019.range.isEqual(new vscode.Range(0, 0, 0, 4)));
							assert.equal(md019.severity, vscode.DiagnosticSeverity.Warning);
							assert.equal(md019.source, "markdownlint");
							// @ts-ignore
							assert.equal(md012.code.value, "MD012");
							assert.equal(
								// @ts-ignore
								md012.code.target.toString(),
								"https://github.com/DavidAnson/markdownlint/blob/v0.31.1/doc/md012.md"
							);
							assert.equal(
								md012.message,
								"MD012/no-multiple-blanks: Multiple consecutive blank lines [Expected: 1; Actual: 2]"
							);
							assert.ok(md012.range.isEqual(new vscode.Range(2, 0, 2, 0)));
							assert.equal(md012.severity, vscode.DiagnosticSeverity.Warning);
							assert.equal(md012.source, "markdownlint");
							vscode.commands.executeCommand("markdownlint.fixAll");
							fixedAll = true;
						} else if ((diagnostics.length === 0) && fixedAll) {
							resolve();
						}
					});
				})
			);
			vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")));
		});
	},

	function openLintEditCloseClean () {
		return testWrapper((resolve, reject, disposables) => {
			let closedActiveEditor = false;
			disposables.push(
				vscode.window.onDidChangeActiveTextEditor((textEditor) => {
					callbackWrapper(reject, () => {
						if (textEditor) {
							assert.ok(textEditor.document.uri.path.endsWith("/README.md"));
							textEditor.edit((editBuilder) => {
								editBuilder.insert(new vscode.Position(0, 1), " ");
								editBuilder.insert(new vscode.Position(1, 0), "\n");
							});
						}
					});
				}),
				vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
					callbackWrapper(reject, () => {
						const {uris} = diagnosticChangeEvent;
						assert.equal(uris.length, 1);
						const [ uri ] = uris;
						const diagnostics = vscode.languages.getDiagnostics(uri);
						if ((diagnostics.length > 0) && !closedActiveEditor) {
							vscode.commands.executeCommand("workbench.action.closeActiveEditor");
							closedActiveEditor = true;
						} else if ((diagnostics.length === 0) && closedActiveEditor) {
							resolve();
						}
					});
				})
			);
			vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")));
		});
	}

];

module.exports = {tests};
