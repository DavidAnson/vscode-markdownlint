"use strict";

/* global Promise */

// Requires
var vscode = require("vscode");
var markdownlint = require("markdownlint");
var fs = require("fs");
var path = require("path");
var packageJson = require("./package.json");

// Constants
var extensionName = packageJson.name;
var markdownlintVersion = packageJson
	.dependencies
	.markdownlint
	.replace(/[^\d.]/, "");
var configFileName = ".markdownlint.json";
var markdownLanguageId = "markdown";
var markdownlintRulesMdPrefix = "https://github.com/DavidAnson/markdownlint/blob/v";
var markdownlintRulesMdPostfix = "/doc/Rules.md";
var clickForInfo = "Click for more information about ";
var clickToFix = "Click to fix this violation of ";
var fixLineCommandName = "markdownlint.fixLine";
var throttleDuration = 500;

// Shared RegExps
var bareUrlRe = /(?:http|ftp)s?:\/\/[^\s]*/i;
var reversedLinkRe = /\(([^)]+)\)\[([^\]^][^\]]*)]/;
var spaceInsideCodeRe = /`(?:\s+([^`]*?)\s*|([^`]*?)\s+)`/;
var spaceInsideEmphasisRe = /(\*\*?|__?)(?:\s+(.+?)\s*|(.+?)\s+)\1/;
var spaceInsideLinkRe = /\[(?:\s+([^\]]*?)\s*|([^\]]*?)\s+)](?=\(\S*\))/;
var trailingSpaceRe = /\s+$/;

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
	return text.replace(/^(\s*#+)\s*(.*?)\s*(#+\s*)$/, "$1 $2 $3");
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
var fixFunctions = {
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
var outputChannel = null;
var diagnosticCollection = null;
var workspaceConfig = null;
var configMap = {};
var throttle = {
	"document": null,
	"timeout": null
};

// Writes date and message to the output channel
function outputLine (message) {
	var datePrefix = "[" + (new Date()).toLocaleTimeString() + "] ";
	outputChannel.appendLine(datePrefix + message);
}

// Returns rule configuration from nearest .markdownlint.json or workspace
function getConfig (document) {
	var dir = path.dirname(document.fileName);
	// While inside the workspace
	while (vscode.workspace.rootPath && !path.relative(vscode.workspace.rootPath, dir).startsWith("..")) {
		// Use cached configuration if present
		if (configMap[dir]) {
			return configMap[dir];
		}
		if (configMap[dir] === undefined) {
			// Look for .markdownlint.json in current directory
			var configFilePath = path.join(dir, configFileName);
			if (fs.existsSync(configFilePath)) {
				outputLine("INFO: Loading custom configuration from '" + configFilePath +
					"', will override user/workspace/custom configuration for parent directory and children.");
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
		var parent = path.dirname(dir);
		if (dir === parent) {
			break;
		}
		dir = parent;
	}
	// Default to workspace configuration
	return workspaceConfig;
}

// Lints a Markdown document
function lint (document) {
	// Skip if not Markdown
	if (document.languageId !== markdownLanguageId) {
		return;
	}

	// Configure
	var options = {
		"strings": {
			"document": document.getText()
		},
		"config": getConfig(document)
	};
	var diagnostics = [];

	// Lint and create Diagnostics
	markdownlint
		.sync(options)
		.document
		.forEach(function forResult (result) {
			var ruleName = result.ruleName;
			var ruleDescription = result.ruleDescription;
			var message = ruleName + "/" + result.ruleAlias + ": " + ruleDescription;
			if (result.errorDetail) {
				message += " [" + result.errorDetail + "]";
			}
			var range = document.lineAt(result.lineNumber - 1).range;
			if (result.errorRange) {
				var start = result.errorRange[0] - 1;
				var end = start + result.errorRange[1];
				range = range.with(range.start.with(undefined, start), range.end.with(undefined, end));
			}
			var diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
			diagnostic.code = markdownlintRulesMdPrefix + markdownlintVersion + markdownlintRulesMdPostfix +
				"#" + ruleName.toLowerCase();
			diagnostics.push(diagnostic);
		});

	// Publish
	diagnosticCollection.set(document.uri, diagnostics);
}

// Implements CodeActionsProvider.provideCodeActions to provide information and fix rule violations
function provideCodeActions (document, range, codeActionContext) {
	var codeActions = [];
	var diagnostics = codeActionContext.diagnostics || [];
	diagnostics.forEach(function forDiagnostic (diagnostic) {
		var ruleNameAlias = diagnostic.message.split(":")[0];
		var ruleName = ruleNameAlias.split("/")[0];
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
					diagnostic.range.start.line,
					ruleName
				]
			});
		}
	});
	return codeActions;
}

// Fixes violations of a rule on a line
function fixLine (lineIndex, ruleName) {
	return new Promise(function executor (resolve, reject) {
		var editor = vscode.window.activeTextEditor;
		var line = editor && editor.document.lineAt(lineIndex);
		var range = line && line.range;
		var text = line && line.text;
		var fixFunction = fixFunctions[ruleName];
		var fixedText = fixFunction && fixFunction(text || "");
		if (editor && fixedText) {
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
	configMap = {};
	lintOpenFiles();
}

// Load workspace configuration
function loadWorkspaceConfig () {
	outputLine("INFO: Loading user/workspace configuration from Visual Studio Code preferences.");
	var settings = vscode.workspace.getConfiguration(packageJson.displayName);
	workspaceConfig = settings.get("config");
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
	outputChannel = vscode.window.createOutputChannel(extensionName);
	context.subscriptions.push(outputChannel);

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(lint),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(loadWorkspaceConfig)
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
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file(s)
	if (vscode.workspace.rootPath) {
		// Use "/" instead of "\" due to bug in VS Code glob implementation
		var fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/" + configFileName);
		context.subscriptions.push(
			fileSystemWatcher,
			fileSystemWatcher.onDidCreate(clearConfigMap),
			fileSystemWatcher.onDidChange(clearConfigMap),
			fileSystemWatcher.onDidDelete(clearConfigMap)
		);
	}

	loadWorkspaceConfig();
}

exports.activate = activate;
