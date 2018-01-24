"use strict";

/* global Promise */

// Requires
const vscode = require("vscode");
const markdownlint = require("markdownlint");
const fs = require("fs");
const path = require("path");
const packageJson = require("./package.json");

// Constants
const extensionDisplayName = packageJson.displayName;
const markdownlintVersion = packageJson
	.dependencies
	.markdownlint
	.replace(/[^\d.]/, "");
const configFileName = ".markdownlint.json";
const markdownLanguageId = "markdown";
const markdownlintRulesMdPrefix = "https://github.com/DavidAnson/markdownlint/blob/v";
const markdownlintRulesMdPostfix = "/doc/Rules.md";
const clickForInfo = "Click for more information about ";
const clickToFix = "Click to fix this violation of ";
const fixLineCommandName = "markdownlint.fixLine";
const throttleDuration = 500;

// Shared RegExps
const bareUrlRe = /(?:http|ftp)s?:\/\/[^\s]*/i;
const reversedLinkRe = /\(([^)]+)\)\[([^\]^][^\]]*)]/;
const spaceInsideCodeRe = /`(?:\s+([^`]*?)\s*|([^`]*?)\s+)`/;
const spaceInsideEmphasisRe = /(\*\*?|__?)(?:\s+(.+?)\s*|(.+?)\s+)\1/;
const spaceInsideLinkRe = /\[(?:\s+([^\]]*?)\s*|([^\]]*?)\s+)]/;
const trailingSpaceRe = /\s+$/;

// Fix functions
function removeLeadingWhitespace (text) {
	return text.replace(/^\s+/, "");
}
function removeTrailingWhitespace (text) {
	return text.replace(trailingSpaceRe, "");
}
function replaceTabsWithSpaces (text) {
	return text.replace(/\t/g, "    ");
}
function fixAtxHeaderFormat (text) {
	return text.replace(/^(\s*#+)\s*(.*)$/, "$1 $2");
}
function fixAtxClosedHeaderFormat (text) {
	return fixAtxHeaderFormat(text).replace(/^(.*?)\s*(#+\s*)$/, "$1 $2");
}
function fixBlockquoteSpacing (text) {
	return text.replace(/^(\s*(> )+)\s+(.*)$/, "$1$3");
}
function addBlockquoteJoiner (text) {
	return text.replace(/^\s*$/, ">");
}
function wrapBareUrl (text) {
	return text.replace(bareUrlRe, "<$&>");
}
function fixReversedLink (text) {
	return text.replace(reversedLinkRe, "[$1]($2)");
}
function fixSpaceInEmphasis (text) {
	return text.replace(spaceInsideEmphasisRe, "$1$2$3$1");
}
function fixSpaceInCode (text) {
	return text.replace(spaceInsideCodeRe, "`$1$2`");
}
function fixSpaceInLink (text) {
	return text.replace(spaceInsideLinkRe, "[$1$2]");
}
const fixFunctions = {
	"MD006": removeLeadingWhitespace,
	"MD009": removeTrailingWhitespace,
	"MD010": replaceTabsWithSpaces,
	"MD011": fixReversedLink,
	"MD018": fixAtxHeaderFormat,
	"MD019": fixAtxHeaderFormat,
	"MD020": fixAtxClosedHeaderFormat,
	"MD021": fixAtxClosedHeaderFormat,
	"MD023": removeLeadingWhitespace,
	"MD027": fixBlockquoteSpacing,
	"MD028": addBlockquoteJoiner,
	"MD034": wrapBareUrl,
	"MD037": fixSpaceInEmphasis,
	"MD038": fixSpaceInCode,
	"MD039": fixSpaceInLink
};

// Variables
let outputChannel = null;
let diagnosticCollection = null;
let configMap = {};
const throttle = {
	"document": null,
	"timeout": null
};

// Writes date and message to the output channel
function outputLine (message) {
	const datePrefix = "[" + (new Date()).toLocaleTimeString() + "] ";
	outputChannel.appendLine(datePrefix + message);
}

// Returns rule configuration from nearest .markdownlint.json or workspace
function getConfig (document) {
	const name = document.fileName;
	let dir = path.dirname(name);
	let workspaceDetail = "not in a workspace folder";
	// While inside the workspace
	while (vscode.workspace.getWorkspaceFolder(vscode.Uri.file(dir))) {
		workspaceDetail = "no configuration file in workspace folder";
		// Use cached configuration if present for directory
		if (configMap[dir]) {
			return configMap[dir];
		}
		if (configMap[dir] === undefined) {
			// Look for .markdownlint.json in current directory
			const configFilePath = path.join(dir, configFileName);
			if (fs.existsSync(configFilePath)) {
				outputLine("INFO: Loading custom configuration from '" + configFilePath +
					"', overrides user/workspace/custom configuration for directory and its children.");
				try {
					return (configMap[dir] = markdownlint.readConfigSync(configFilePath));
				} catch (ex) {
					outputLine("ERROR: Unable to read configuration file '" +
						configFilePath + "' (" + (ex.message || ex.toString()) + ").");
					outputChannel.show();
				}
			}
			// Remember missing or invalid file
			configMap[dir] = null;
		}
		// Move to parent directory, stop if no parent
		const parent = path.dirname(dir);
		if (dir === parent) {
			break;
		}
		dir = parent;
	}
	// Use cached configuration if present for file
	if (configMap[name]) {
		return configMap[name];
	}
	// Use workspace configuration
	outputLine("INFO: Loading user/workspace configuration for '" + name + "' (" + workspaceDetail + ").");
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	return (configMap[name] = configuration.get("config"));
}

// Lints a Markdown document
function lint (document) {
	// Skip if not Markdown
	if (document.languageId !== markdownLanguageId) {
		return;
	}

	// Configure
	const options = {
		"strings": {
			"document": document.getText()
		},
		"config": getConfig(document)
	};
	const diagnostics = [];

	// Lint and create Diagnostics
	markdownlint
		.sync(options)
		.document
		.forEach(function forResult (result) {
			const ruleName = result.ruleNames[0];
			const ruleDescription = result.ruleDescription;
			let message = result.ruleNames.join("/") + ": " + ruleDescription;
			if (result.errorDetail) {
				message += " [" + result.errorDetail + "]";
			}
			let range = document.lineAt(result.lineNumber - 1).range;
			if (result.errorRange) {
				const start = result.errorRange[0] - 1;
				const end = start + result.errorRange[1];
				range = range.with(range.start.with(undefined, start), range.end.with(undefined, end));
			}
			const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
			diagnostic.code = markdownlintRulesMdPrefix + markdownlintVersion + markdownlintRulesMdPostfix +
				"#" + ruleName.toLowerCase();
			diagnostic.source = extensionDisplayName;
			diagnostics.push(diagnostic);
		});
	// Publish
	diagnosticCollection.set(document.uri, diagnostics);
}

// Implements CodeActionsProvider.provideCodeActions to provide information and fix rule violations
function provideCodeActions (document, range, codeActionContext) {
	const codeActions = [];
	const diagnostics = codeActionContext.diagnostics || [];
	diagnostics.filter(function filterDiagnostic (diagnostic) {
		return diagnostic.source === extensionDisplayName;
	}).forEach(function forDiagnostic (diagnostic) {
		const ruleNameAlias = diagnostic.message.split(":")[0];
		const ruleName = ruleNameAlias.split("/")[0];
		codeActions.push({
			"title": clickForInfo + ruleNameAlias,
			"command": "vscode.open",
			"arguments": [ vscode.Uri.parse(diagnostic.code) ]
		});
		if (diagnostic.range.isSingleLine && fixFunctions[ruleName]) {
			codeActions.push({
				"title": clickToFix + ruleNameAlias,
				"command": fixLineCommandName,
				"arguments": [
					diagnostic.range,
					ruleName
				]
			});
		}
	});
	return codeActions;
}

// Fixes violations of a rule on a line
function fixLine (range, ruleName) {
	return new Promise(function executor (resolve, reject) {
		const editor = vscode.window.activeTextEditor;
		const line = editor && editor.document.lineAt(range.start.line);
		const text = line && line.text.substring(range.start.character, range.end.character);
		const fixFunction = fixFunctions[ruleName];
		const fixedText = fixFunction && fixFunction(text || "");
		if (editor && (typeof fixedText === "string")) {
			editor.edit(function createEdits (editBuilder) {
				editBuilder.replace(range, fixedText);
			}).then(resolve, reject);
		} else {
			reject();
		}
	});
}

// Lint all open files
function lintOpenFiles () {
	(vscode.workspace.textDocuments || []).forEach(lint);
}

// Clears the map of custom configuration files and re-lints open files
function clearConfigMap () {
	outputLine("INFO: Resetting configuration cache due to '" + configFileName + "' or setting change.");
	configMap = {};
	lintOpenFiles();
}

// Suppresses a pending lint for the specified document
function suppressLint (document) {
	if (throttle.timeout && (document === throttle.document)) {
		clearTimeout(throttle.timeout);
		throttle.document = null;
		throttle.timeout = null;
	}
}

// Requests a lint of the specified document
function requestLint (document) {
	suppressLint(document);
	throttle.document = document;
	throttle.timeout = setTimeout(function waitThrottleDuration () {
		// Do not use throttle.document in this function; it may have changed
		lint(document);
		suppressLint(document);
	}, throttleDuration);
}

// Handles the didChangeTextDocument event
function didChangeTextDocument (change) {
	requestLint(change.document);
}

// Handles the didCloseTextDocument event
function didCloseTextDocument (document) {
	suppressLint(document);
	diagnosticCollection.delete(document.uri);
}

function activate (context) {
	// Create OutputChannel
	outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
	context.subscriptions.push(outputChannel);

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(lint),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(clearConfigMap)
	);

	// Register CodeActionsProvider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(markdownLanguageId, {
			"provideCodeActions": provideCodeActions
		})
	);

	// Register Command
	context.subscriptions.push(
		vscode.commands.registerCommand(fixLineCommandName, fixLine)
	);

	// Create DiagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionDisplayName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file(s) ("/" vs. "\" due to bug in VS Code glob)
	const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/" + configFileName);
	context.subscriptions.push(
		fileSystemWatcher,
		fileSystemWatcher.onDidCreate(clearConfigMap),
		fileSystemWatcher.onDidChange(clearConfigMap),
		fileSystemWatcher.onDidDelete(clearConfigMap)
	);

	// Lint already-open files
	lintOpenFiles();
}

exports.activate = activate;
