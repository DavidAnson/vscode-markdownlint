"use strict";

// Requires
var vscode = require("vscode");
var markdownlint = require("markdownlint");
var fs = require("fs");
var path = require("path");
var packageJson = require("./package.json");
var defaultConfig = require("./default-config.json");

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
var codeActionPrefix = "Click for more information about ";
var badConfig = "Unable to read configuration file ";
var throttleDuration = 500;

// Variables
var diagnosticCollection = null;
var customConfig = null;
var throttle = {
	"document": null,
	"timeout": null
};

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
		"config": customConfig || defaultConfig,
		"resultVersion": 1
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
			var range = document.lineAt(result.lineNumber - 1).range;
			if (result.errorRange) {
				var start = result.errorRange[0] - 1;
				var end = start + result.errorRange[1];
				range = range.with(range.start.with(undefined, start), range.end.with(undefined, end));
			}
			var diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
			diagnostic.code = markdownlintRulesMdPrefix + markdownlintVersion + markdownlintRulesMdPostfix +
				"#" + ruleName.toLowerCase() + "---" + ruleDescription.toLowerCase().replace(/ /g, "-");
			diagnostics.push(diagnostic);
		});

	// Publish
	diagnosticCollection.set(document.uri, diagnostics);
}

// Implements CodeActionsProvider.provideCodeActions to open info links for rules
function provideCodeActions (document, range, codeActionContext) {
	var diagnostics = codeActionContext.diagnostics || [];
	return diagnostics.map(function forDiagnostic (diagnostic) {
		return {
			"title": codeActionPrefix + diagnostic.message.substr(0, 5),
			"command": "vscode.open",
			"arguments": [ vscode.Uri.parse(diagnostic.code) ]
		};
	});
}

// Loads custom rule configuration
function loadCustomConfig () {
	var settings = vscode.workspace.getConfiguration(packageJson.displayName);
	customConfig = settings.get("config");

	var rootPath = vscode.workspace.rootPath;
	if (rootPath) {
		var configFilePath = path.join(rootPath, configFileName);
		if (fs.existsSync(configFilePath)) {
			try {
				customConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
			} catch (ex) {
				vscode.window.showWarningMessage(badConfig + "'" + configFilePath + "' (" + (ex.message || ex.toString()) + ")");
			}
		}
	}

	// Re-lint all open files
	(vscode.workspace.textDocuments || []).forEach(lint);
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
	// Hook up to workspace events
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(lint),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(loadCustomConfig));

	// Register CodeActionsProvider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(markdownLanguageId, {
			"provideCodeActions": provideCodeActions
		}));

	// Create DiagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file
	var rootPath = vscode.workspace.rootPath;
	if (rootPath) {
		var fileSystemWatcher = vscode.workspace.createFileSystemWatcher(path.join(rootPath, configFileName));
		context.subscriptions.push(
			fileSystemWatcher,
			fileSystemWatcher.onDidCreate(loadCustomConfig),
			fileSystemWatcher.onDidChange(loadCustomConfig),
			fileSystemWatcher.onDidDelete(loadCustomConfig));
	}

	// Load custom rule config
	loadCustomConfig();
}

exports.activate = activate;
