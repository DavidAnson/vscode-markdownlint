// @ts-check

"use strict";

// This must be CommonJS or the VS Code host fails with:
// Error: Cannot find package 'vscode' imported from .../tests.mjs

/* eslint-disable func-style */

const assert = require("node:assert");
const fs = require("node:fs/promises");
const path = require("node:path");
const vscode = require("vscode");

// eslint-disable-next-line no-empty-function
function noop () {}

function testWrapper (test) {
	return new Promise((resolve, reject) => {
		const disposables = [];
		// eslint-disable-next-line no-use-before-define
		const timeout = setTimeout(() => rejectWrapper(new Error("TEST TIMEOUT")), 10_000);
		const cleanup = () => {
			clearTimeout(timeout);
			for (const disposable of disposables) {
				disposable.dispose();
			}
			return vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor")
				.then(() => {
					const workspaceSettingsJson = path.join(__dirname, "..", ".vscode", "settings.json");
					return fs.access(workspaceSettingsJson).then(() => fs.rm(workspaceSettingsJson), noop);
				});
		};
		const resolveWrapper = (value) => {
			cleanup().then(() => resolve(value), reject);
		};
		const rejectWrapper = (reason) => {
			cleanup().then(() => reject(reason?.stack || reason), reject);
		};
		Promise.resolve().then(() => test(resolveWrapper, rejectWrapper, disposables)).catch(rejectWrapper);
	});
}

function callbackWrapper (reject, callback) {
	Promise.resolve().then(callback).catch(reject);
}

function getDiagnostics (diagnosticChangeEvent, pathEndsWith) {
	const uris = diagnosticChangeEvent.uris.filter(
		(uri) => (uri.scheme === "file") && (uri.path.endsWith(pathEndsWith))
	);
	if (uris.length === 1) {
		const [ uri ] = uris;
		return vscode.languages.getDiagnostics(uri);
	}
	return [];
}

// Open README.md, create 2 violations, verify diagnostics, run fixAll command
function openLintEditVerifyFixAll () {
	return testWrapper((resolve, reject, disposables) => {
		let fixedAll = false;
		disposables.push(
			vscode.window.onDidChangeActiveTextEditor((textEditor) => {
				callbackWrapper(reject, () => {
					assert.ok(textEditor.document.uri.path.endsWith("/README.md"));
					return textEditor.edit((editBuilder) => {
						// MD019
						editBuilder.insert(new vscode.Position(0, 1), " ");
						// MD012
						editBuilder.insert(new vscode.Position(1, 0), "\n");
					});
				});
			}),
			vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
				callbackWrapper(reject, () => {
					const diagnostics = getDiagnostics(diagnosticChangeEvent, "/README.md");
					if ((diagnostics.length > 0) && !fixedAll) {
						const [ md019, md012 ] = diagnostics;
						// @ts-ignore
						assert.equal(md019.code.value, "MD019");
						assert.equal(
							// @ts-ignore
							md019.code.target.toString().replace(/v\d+\.\d+\.\d+/, "v0.0.0"),
							"https://github.com/DavidAnson/markdownlint/blob/v0.0.0/doc/md019.md"
						);
						assert.equal(
							md019.message,
							"MD019/no-multiple-space-atx: Multiple spaces after hash on atx style heading"
						);
						assert.ok(md019.range.isEqual(new vscode.Range(0, 2, 0, 3)));
						assert.equal(md019.severity, vscode.DiagnosticSeverity.Warning);
						assert.equal(md019.source, "markdownlint");
						// @ts-ignore
						assert.equal(md012.code.value, "MD012");
						assert.equal(
							// @ts-ignore
							md012.code.target.toString().replace(/v\d+\.\d+\.\d+/, "v0.0.0"),
							"https://github.com/DavidAnson/markdownlint/blob/v0.0.0/doc/md012.md"
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
		vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")))
			.then(noop, reject);
	});
}

// Open README.md, create two violations, close file, verify no diagnostics
function openLintEditCloseClean () {
	return testWrapper((resolve, reject, disposables) => {
		let closedActiveEditor = false;
		disposables.push(
			vscode.window.onDidChangeActiveTextEditor((textEditor) => {
				// eslint-disable-next-line consistent-return
				callbackWrapper(reject, () => {
					if (textEditor) {
						assert.ok(textEditor.document.uri.path.endsWith("/README.md"));
						return textEditor.edit((editBuilder) => {
							editBuilder.insert(new vscode.Position(0, 1), " ");
							editBuilder.insert(new vscode.Position(1, 0), "\n");
						});
					}
				});
			}),
			vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
				callbackWrapper(reject, () => {
					const diagnostics = getDiagnostics(diagnosticChangeEvent, "/README.md");
					if ((diagnostics.length > 0) && !closedActiveEditor) {
						vscode.commands.executeCommand("workbench.action.closeActiveEditor");
						closedActiveEditor = true;
					} else if ((diagnostics.length === 0) && closedActiveEditor) {
						resolve();
					}
				});
			})
		);
		vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")))
			.then(noop, reject);
	});
}

// Open README.md, add non-default violation (autolink), verify diagnostic
function addNonDefaultViolation () {
	return testWrapper((resolve, reject, disposables) => {
		let validated = false;
		disposables.push(
			vscode.window.onDidChangeActiveTextEditor((textEditor) => {
				// eslint-disable-next-line consistent-return
				callbackWrapper(reject, () => {
					if (textEditor) {
						assert.ok(textEditor.document.uri.path.endsWith("/README.md"));
						return textEditor.edit((editBuilder) => {
							editBuilder.insert(new vscode.Position(2, 0), "<https:\\example.com>\n\n");
						});
					}
				});
			}),
			vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
				callbackWrapper(reject, () => {
					const diagnostics = getDiagnostics(diagnosticChangeEvent, "/README.md");
					if ((diagnostics.length === 1) && !validated) {
						// @ts-ignore
						assert.equal(diagnostics[0].code.value, "MD054");
						validated = true;
						vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor")
							.then(noop, reject);
					} else if ((diagnostics.length === 0) && validated) {
						// Make sure diagonstics are clean for next test
						resolve();
					}
				});
			})
		);
		vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")))
			.then(noop, reject);
	});
}

// Open README.md, create violations, save file, open diff view, undo edits
function openEditDiffRevert () {
	return testWrapper((resolve, reject, disposables) => {
		let runOnce = false;
		let intervalId = null;
		disposables.push(
			vscode.window.onDidChangeActiveTextEditor((textEditor) => {
				// eslint-disable-next-line consistent-return
				callbackWrapper(reject, () => {
					if (!runOnce) {
						runOnce = true;
						assert.ok(textEditor.document.uri.path.endsWith("/CHANGELOG.md"));
						return textEditor.edit((editBuilder) => {
							editBuilder.insert(new vscode.Position(0, 1), " ");
							editBuilder.insert(new vscode.Position(1, 0), "\n");
						}).then(
							() => textEditor.document.save()
						);
					}
				});
			}),
			vscode.workspace.onDidSaveTextDocument(() => {
				callbackWrapper(reject, () => {
					intervalId = setInterval(() => vscode.commands.executeCommand("git.openChange"), 50);
				});
			}),
			vscode.window.onDidChangeVisibleTextEditors((textEditors) => {
				callbackWrapper(reject, () => {
					if (textEditors.length === 2) {
						clearInterval(intervalId);
						vscode.commands.executeCommand("undo").then(
							() => vscode.commands.executeCommand("workbench.action.files.save")
						).then(
							() => vscode.commands.executeCommand("workbench.action.closeAllEditors")
						).then(resolve);
					}
				});
			})
		);
		vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "CHANGELOG.md")))
			.then(noop, reject);
	});
}

// Open README.md, add custom rule, verify diagnostics, remove
function dynamicWorkspaceSettingsChange () {
	return testWrapper((resolve, reject, disposables) => {
		const configuration = vscode.workspace.getConfiguration("markdownlint");
		let editedSettings = false;
		let validated = false;
		disposables.push(
			vscode.languages.onDidChangeDiagnostics((diagnosticChangeEvent) => {
				callbackWrapper(reject, () => {
					const diagnostics = getDiagnostics(diagnosticChangeEvent, "/README.md");
					if ((diagnostics.length === 0) && !editedSettings) {
						editedSettings = true;
						configuration.update("customRules", [ "./test-ui/first-line.cjs" ], vscode.ConfigurationTarget.Workspace);
					} else if ((diagnostics.length > 0) && editedSettings) {
						validated = true;
						configuration.update("customRules", undefined, vscode.ConfigurationTarget.Workspace);
					} else if ((diagnostics.length === 0) && validated) {
						resolve();
					}
				});
			})
		);
		vscode.window.showTextDocument(vscode.Uri.file(path.join(__dirname, "..", "README.md")))
			.then(noop, reject);
	});
}

// Run lintWorkspace command
function lintWorkspace () {
	return testWrapper((resolve, reject, disposables) => {
		disposables.push(
			vscode.window.onDidOpenTerminal((terminal) => {
				callbackWrapper(reject, () => {
					assert.equal(terminal.name, "Lint all Markdown files in the workspace with markdownlint");
					// Unable to examine contents of terminal using VS Code API
					resolve();
				});
			})
		);
		vscode.commands.executeCommand("markdownlint.lintWorkspace")
			.then(noop, reject);
	});
}

const tests = [
	openLintEditVerifyFixAll,
	openLintEditCloseClean,
	addNonDefaultViolation
];
if (vscode.workspace.workspaceFolders) {
	tests.push(
		openEditDiffRevert,
		dynamicWorkspaceSettingsChange,
		// Run this last because its diagnostics persist after test completion
		lintWorkspace
	);
}

module.exports = { tests };
