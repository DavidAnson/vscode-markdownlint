"use strict";

// Requires
const vscode = require("vscode");

// Lazy requires
function lazyRequire (name) {
	let module = null;
	return new Proxy({}, {
		"get": (obj, prop) => {
			module = module || require(name);
			return module[prop];
		}
	});
}
const markdownlint = lazyRequire("markdownlint");
const minimatch = lazyRequire("minimatch");
const jsYaml = lazyRequire("js-yaml");
const fs = lazyRequire("fs");
const path = lazyRequire("path");

// Constants
const extensionDisplayName = "markdownlint";
const configFileGlob = ".markdownlint.{json,yaml,yml}";
const configFileNames = [
	".markdownlint.json",
	".markdownlint.yaml",
	".markdownlint.yml"
];
const markdownLanguageId = "markdown";
const markdownScheme = "file";
const documentSelector = {
	"language": markdownLanguageId,
	"scheme": markdownScheme
};

const clickForInfo = "Click for more information about ";
const clickToFix = "Click to fix this violation of ";
const fixLineCommandName = "markdownlint.fixLine";
const clickForConfigureInfo = `Click for details about configuring ${extensionDisplayName} rules`;
const clickForConfigureUrl = "https://github.com/DavidAnson/vscode-markdownlint#configure";
const throttleDuration = 500;
const customRuleExtensionPrefixRe = /^\{([^}]+)\}\/(.*)$/iu;

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
const ruleNameToInformation = {};
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
	// @ts-ignore
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
				// @ts-ignore
				const configFilePath = path.join(dir, configFileName);
				// @ts-ignore
				if (fs.existsSync(configFilePath)) {
					outputLine("INFO: Loading custom configuration from '" + configFilePath +
						"', overrides user/workspace/custom configuration for directory and its children.");
					try {
						// @ts-ignore
						return (configMap[dir] = markdownlint.readConfigSync(configFilePath, [
							JSON.parse,
							// @ts-ignore
							(content) => jsYaml.safeLoad(content)
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
		// @ts-ignore
		const parent = path.dirname(dir);
		// Move to parent directory, stop if no parent
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
		const itemAllow = "Allow";
		const itemAlwaysAllow = "Always allow";
		const itemBlock = "Block";
		const sectionCustomRules = "customRules";
		const sectionCustomRulesAlwaysAllow = "customRulesAlwaysAllow";
		const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
		const customRulesPaths = configuration.get(sectionCustomRules);
		if (customRulesPaths.length) {
			const workspaceRootPath = vscode.workspace.rootPath;
			const allowPaths = configuration.get(sectionCustomRulesAlwaysAllow);
			const customRulesMetadata = configuration.inspect(sectionCustomRules);
			const showWarning = customRulesMetadata.workspaceValue && !allowPaths.includes(workspaceRootPath);
			const promise = showWarning ?
				vscode.window.showWarningMessage(
					"This workspace includes custom rules for Markdown linting. " +
					"Custom rules include JavaScript that runs within VS Code. " +
					"Only allow custom rules if you trust the workspace.",
					itemAllow, itemAlwaysAllow, itemBlock
				) :
				Promise.resolve(itemAllow);
			promise.then((response) => {
				if (response === itemAlwaysAllow) {
					allowPaths.push(workspaceRootPath);
					configuration.update(sectionCustomRulesAlwaysAllow, allowPaths, vscode.ConfigurationTarget.Global);
				}
				if ((response === itemAllow) || (response === itemAlwaysAllow)) {
					const workspacePath = vscode.workspace.workspaceFolders ?
						vscode.workspace.workspaceFolders[0].uri.fsPath :
						"";
					customRulesPaths.forEach((rulePath) => {
						let resolvedPath = null;
						try {
							const match = customRuleExtensionPrefixRe.exec(rulePath);
							if (match) {
								const extensionName = match[1];
								const relativePath = match[2];
								const extension = vscode.extensions.getExtension(extensionName);
								if (!extension) {
									throw new Error(`Extension '${extensionName}' not installed`);
								}
								// @ts-ignore
								resolvedPath = path.resolve(extension.extensionPath, relativePath);
							} else {
								// @ts-ignore
								resolvedPath = path.resolve(workspacePath, rulePath);
							}
							const exports = require(resolvedPath);
							const rules = Array.isArray(exports) ?
								exports :
								[ exports ];
							rules.forEach((rule) => {
								if (rule.names && rule.description && rule.tags && rule.function) {
									customRules.push(rule);
								} else {
									outputLine(`WARNING: Skipping invalid custom rule '${JSON.stringify(rule)}'.`);
								}
							});
							outputLine(`INFO: Loaded custom rules from '${resolvedPath}'.`);
						} catch (ex) {
							outputLine("ERROR: Unable to load custom rules from '" + (resolvedPath || rulePath) +
								"' (" + (ex.message || ex.toString()) + ").");
						}
					});
					cleanLintVisibleFiles();
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
			// @ts-ignore
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
	// @ts-ignore
	const normalizedPath = relativePath.split(path.sep).join("/");
	if (getIgnores().every((ignore) => !ignore.test(normalizedPath))) {

		// Configure
		const uri = document.uri.toString();
		const options = {
			"strings": {
				[uri]: document.getText()
			},
			"config": getConfig(document),
			"customRules": getCustomRules(),
			"markdownItPlugins": [ [ require("markdown-it-katex") ] ]
		};

		// Lint and create Diagnostics
		try {
			markdownlint
				// @ts-ignore
				.sync(options)[uri]
				.forEach((result) => {
					const ruleName = result.ruleNames[0];
					const ruleDescription = result.ruleDescription;
					ruleNameToInformation[ruleName] = result.ruleInformation;
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
					diagnostic.code = ruleName;
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
	let showConfigureInfo = false;
	diagnostics
		.filter((diagnostic) => diagnostic.source === extensionDisplayName)
		.forEach((diagnostic) => {
			const ruleName = diagnostic.code;
			const ruleNameAlias = diagnostic.message.split(":")[0];
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
				// @ts-ignore
				fixAction.isPreferred = true;
				codeActions.push(fixAction);
			}
			// Provide code action for information about the violation
			const ruleInformation = ruleNameToInformation[ruleName];
			if (ruleInformation) {
				const infoTitle = clickForInfo + ruleNameAlias;
				const infoAction = new vscode.CodeAction(infoTitle, vscode.CodeActionKind.QuickFix);
				infoAction.command = {
					"title": infoTitle,
					"command": "vscode.open",
					"arguments": [ vscode.Uri.parse(ruleInformation) ]
				};
				infoAction.diagnostics = [ diagnostic ];
				codeActions.push(infoAction);
			}
			showConfigureInfo = true;
		});
	// Add information about configuring rules
	if (showConfigureInfo) {
		const configureInfoAction = new vscode.CodeAction(clickForConfigureInfo, vscode.CodeActionKind.QuickFix);
		configureInfoAction.command = {
			"title": clickForConfigureInfo,
			"command": "vscode.open",
			"arguments": [ vscode.Uri.parse(clickForConfigureUrl) ]
		};
		codeActions.push(configureInfoAction);
	}
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
			reject(new Error("Unable to fix rule violaton."));
		}
	});
}

// Cleanly (i.e., from scratch) lint all visible files
function cleanLintVisibleFiles () {
	diagnosticCollection.clear();
	didChangeVisibleTextEditors(vscode.window.visibleTextEditors);
}

// Clears the map of custom configuration files and re-lints files
function clearConfigMap (eventUri) {
	outputLine("INFO: Resetting configuration cache due to '" + configFileGlob + "' or setting change.");
	configMap = {};
	if (eventUri) {
		cleanLintVisibleFiles();
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

// Handles the onDidChangeVisibleTextEditors event
function didChangeVisibleTextEditors (textEditors) {
	textEditors.forEach((textEditor) => lint(textEditor.document));
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
	cleanLintVisibleFiles();
}

function activate (context) {
	// Create OutputChannel
	outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
	context.subscriptions.push(outputChannel);

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(didChangeVisibleTextEditors),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidSaveTextDocument(didSaveTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(didChangeConfiguration)
	);

	// Register CodeActionsProvider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(documentSelector, {
			provideCodeActions
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

	// Request (deferred) lint of active document
	if (vscode.window.activeTextEditor) {
		requestLint(vscode.window.activeTextEditor.document);
	}
}

exports.activate = activate;
