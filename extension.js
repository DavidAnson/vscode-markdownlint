"use strict";

// Requires
const vscode = require("vscode");
const markdownlint = require("markdownlint");
const minimatch = require("minimatch");
const jsYaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const packageJson = require("./package.json");

// Constants
const extensionDisplayName = packageJson.displayName;
const markdownlintVersion = packageJson
	.dependencies
	.markdownlint
	.replace(/[^\d.]/, "");
const configFileGlob = ".markdownlint.{json,yaml}";
const configFileNames = [
	".markdownlint.json",
	".markdownlint.yaml"
];
const markdownLanguageId = "markdown";
const markdownScheme = "file";
const documentSelector = {
	"language": markdownLanguageId,
	"scheme": markdownScheme
};

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
function fixAtxHeadingFormat (text) {
	return text.replace(/^(\s*#+)\s*(.*)$/, "$1 $2");
}
function fixAtxClosedHeadingFormat (text) {
	return fixAtxHeadingFormat(text).replace(/^(.*?)\s*(#+\s*)$/, "$1 $2");
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
	"MD018": fixAtxHeadingFormat,
	"MD019": fixAtxHeadingFormat,
	"MD020": fixAtxClosedHeadingFormat,
	"MD021": fixAtxClosedHeadingFormat,
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
let runMap = {};
let customRules = null;
let ignores = null;
const throttle = {
	"document": null,
	"timeout": null
};

// Writes date and message to the output channel
function outputLine (message) {
	const datePrefix = "[" + (new Date()).toLocaleTimeString() + "] ";
	outputChannel.appendLine(datePrefix + message);
}

// Returns rule configuration from nearest config file or workspace
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
			// Look for config file in current directory
			for (const configFileName of configFileNames) {
				const configFilePath = path.join(dir, configFileName);
				if (fs.existsSync(configFilePath)) {
					outputLine("INFO: Loading custom configuration from '" + configFilePath +
						"', overrides user/workspace/custom configuration for directory and its children.");
					try {
						return (configMap[dir] = markdownlint.readConfigSync(configFilePath, [
							JSON.parse,
							jsYaml.safeLoad
						]));
					} catch (ex) {
						outputLine("ERROR: Unable to read configuration file '" +
							configFilePath + "' (" + (ex.message || ex.toString()) + ").");
						outputChannel.show();
					}
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

// Returns custom rule configuration for user/workspace
function getCustomRules () {
	if (!Array.isArray(customRules)) {
		customRules = [];
		const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
		const customRulesPaths = configuration.get("customRules");
		if (customRulesPaths.length) {
			const customRulesMetadata = configuration.inspect("customRules");
			const allow = "Allow";
			const block = "Block";
			const promise = customRulesMetadata.workspaceValue ?
				vscode.window.showWarningMessage(
					"This workspace includes custom rules for Markdown linting. " +
					"Custom rules include JavaScript that runs within VS Code. " +
					"Only allow custom rules if you trust the workspace.",
					allow, block
				) :
				Promise.resolve(allow);
			promise.then((response) => {
				if (response === allow) {
					const rootPath = vscode.workspace.workspaceFolders ?
						vscode.workspace.workspaceFolders[0].uri.fsPath :
						"";
					customRulesPaths.forEach((rulePath) => {
						const resolvedPath = path.resolve(rootPath, rulePath);
						try {
							customRules.push(require(resolvedPath));
							outputLine("INFO: Loaded custom rule '" + resolvedPath + "'.");
						} catch (ex) {
							outputLine("ERROR: Unable to load custom rule '" + resolvedPath +
								"' (" + (ex.message || ex.toString()) + ").");
						}
					});
					lintOpenFiles();
				}
			});
		}
	}
	return customRules;
}

// Clears the custom rule list
function clearCustomRules () {
	customRules = null;
}

// Returns ignore configuration for user/workspace
function getIgnores () {
	if (!Array.isArray(ignores)) {
		ignores = [];
		const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
		const ignorePaths = configuration.get("ignore");
		ignorePaths.forEach((ignorePath) => {
			const ignore = minimatch.makeRe(ignorePath, {
				"dot": true,
				"nocomment": true
			});
			if (ignore) {
				ignores.push(ignore);
			}
		});
	}
	return ignores;
}

// Clears the ignore list
function clearIgnores () {
	ignores = null;
}

// Lints a Markdown document
function lint (document) {
	// Skip if not Markdown or local file
	if ((document.languageId !== markdownLanguageId) || (document.uri.scheme !== markdownScheme)) {
		return;
	}

	// Check ignore list
	const diagnostics = [];
	const relativePath = vscode.workspace.asRelativePath(document.uri, false);
	const normalizedPath = relativePath.split(path.sep).join("/");
	if (getIgnores().every((ignore) => !ignore.test(normalizedPath))) {

		// Configure
		const options = {
			"strings": {
				"document": document.getText()
			},
			"config": getConfig(document),
			"customRules": getCustomRules()
		};

		// Lint and create Diagnostics
		try {
			markdownlint
				.sync(options)
				.document
				.forEach((result) => {
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
		} catch (ex) {
			outputLine("ERROR: Exception while linting:\n" + ex.stack);
		}
	}

	// Publish
	diagnosticCollection.set(document.uri, diagnostics);
}

// Implements CodeActionsProvider.provideCodeActions to provide information and fix rule violations
function provideCodeActions (document, range, codeActionContext) {
	const codeActions = [];
	const diagnostics = codeActionContext.diagnostics || [];
	diagnostics
		.filter((diagnostic) => diagnostic.source === extensionDisplayName)
		.forEach((diagnostic) => {
			const ruleNameAlias = diagnostic.message.split(":")[0];
			const ruleName = ruleNameAlias.split("/")[0];
			// Provide code action for information about the violation
			const infoTitle = clickForInfo + ruleNameAlias;
			const infoAction = new vscode.CodeAction(infoTitle, vscode.CodeActionKind.QuickFix);
			infoAction.command = {
				"title": infoTitle,
				"command": "vscode.open",
				"arguments": [ vscode.Uri.parse(diagnostic.code) ]
			};
			infoAction.diagnostics = [ diagnostic ];
			codeActions.push(infoAction);
			// Provide code action to fix the violation
			if (diagnostic.range.isSingleLine && fixFunctions[ruleName]) {
				const fixTitle = clickToFix + ruleNameAlias;
				const fixAction = new vscode.CodeAction(fixTitle, vscode.CodeActionKind.QuickFix);
				fixAction.command = {
					"title": fixTitle,
					"command": fixLineCommandName,
					"arguments": [
						diagnostic.range,
						ruleName
					]
				};
				fixAction.diagnostics = [ diagnostic ];
				codeActions.push(fixAction);
			}
		});
	return codeActions;
}

// Fixes violations of a rule on a line
function fixLine (range, ruleName) {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		const line = editor && editor.document.lineAt(range.start.line);
		const text = line && line.text.substring(range.start.character, range.end.character);
		const fixFunction = fixFunctions[ruleName];
		const fixedText = fixFunction && fixFunction(text || "");
		if (editor && (typeof fixedText === "string")) {
			editor.edit((editBuilder) => {
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
function clearConfigMap (eventUri) {
	outputLine("INFO: Resetting configuration cache due to '" + configFileGlob + "' or setting change.");
	configMap = {};
	if (eventUri) {
		lintOpenFiles();
	}
}

// Returns the run setting for the document
function getRun (document) {
	const name = document.fileName;
	// Use cached configuration if present for file
	if (runMap[name]) {
		return runMap[name];
	}
	// Read workspace configuration
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	runMap[name] = configuration.get("run");
	outputLine("INFO: Linting for '" + document.fileName + "' will be run '" + runMap[name] + "'.");
	return runMap[name];
}

// Clears the map of run settings
function clearRunMap () {
	runMap = {};
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
	throttle.timeout = setTimeout(() => {
		// Do not use throttle.document in this function; it may have changed
		lint(document);
		suppressLint(document);
	}, throttleDuration);
}

// Handles the onDidChangeTextDocument event
function didChangeTextDocument (change) {
	const document = change.document;
	if ((document.languageId === markdownLanguageId) && (getRun(document) === "onType")) {
		requestLint(document);
	}
}

// Handles the onDidSaveTextDocument event
function didSaveTextDocument (document) {
	if ((document.languageId === markdownLanguageId) && (getRun(document) === "onSave")) {
		lint(document);
		suppressLint(document);
	}
}

// Handles the onDidCloseTextDocument event
function didCloseTextDocument (document) {
	suppressLint(document);
	diagnosticCollection.delete(document.uri);
}

// Handles the onDidChangeConfiguration event
function didChangeConfiguration () {
	clearConfigMap();
	clearRunMap();
	clearCustomRules();
	clearIgnores();
	lintOpenFiles();
}

function activate (context) {
	// Create OutputChannel
	outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
	context.subscriptions.push(outputChannel);

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(lint),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidSaveTextDocument(didSaveTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(didChangeConfiguration)
	);

	// Register CodeActionsProvider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(documentSelector, {
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
	const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/" + configFileGlob);
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
