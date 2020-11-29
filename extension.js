"use strict";

// Requires
const vscode = require("vscode");
const markdownlint = require("markdownlint");
const markdownlintRuleHelpers = require("markdownlint-rule-helpers");
const ignore = require("ignore");
const fs = require("fs");
const path = require("path");

// Optional requires are inlined to avoid startup cost

// @ts-ignore
// eslint-disable-next-line camelcase, multiline-ternary, no-undef
const nodeRequire = (typeof __non_webpack_require__ === "undefined") ? require : __non_webpack_require__;
// Capture Node.js require implementation for dynamic loading of custom rules

// Constants
const extensionDisplayName = "markdownlint";
const configFileGlob = ".markdownlint{.jsonc,.json,.yaml,.yml,rc}";
const markdownlintJson = ".markdownlint.json";
const configFileNames = [
	".markdownlint.jsonc",
	markdownlintJson,
	".markdownlint.yaml",
	".markdownlint.yml",
	".markdownlintrc"
];
const ignoreFileName = ".markdownlintignore";
const markdownLanguageId = "markdown";
const markdownSchemeFile = "file";
const markdownSchemeUntitled = "untitled";
const documentSelectors = [
	{
		"language": markdownLanguageId,
		"scheme": markdownSchemeFile
	},
	{
		"language": markdownLanguageId,
		"scheme": markdownSchemeUntitled
	}
];
const configParsers = [
	(content) => JSON.parse(require("jsonc-parser").stripComments(content)),
	(content) => require("js-yaml").safeLoad(content)
];
const codeActionKindQuickFix = vscode.CodeActionKind.QuickFix;
const codeActionKindSourceFixAll = vscode.CodeActionKind.SourceFixAll.append(extensionDisplayName);
const defaultConfig = {
	"MD013": false
};

const clickForInfo = "Click for more information about ";
const clickToFix = "Click to fix this violation of ";
const fixLineCommandName = "markdownlint.fixLine";
const fixAllCommandTitle = `Fix supported ${extensionDisplayName} violations in the document`;
const fixAllCommandName = "markdownlint.fixAll";
const openConfigFileCommandName = "markdownlint.openConfigFile";
const toggleLintingCommandName = "markdownlint.toggleLinting";
const clickForConfigureInfo = `Click for details about configuring ${extensionDisplayName} rules`;
const clickForConfigureUrl = "https://github.com/DavidAnson/vscode-markdownlint#configure";
const clickForConfigSource = `Click to open this document's ${extensionDisplayName} configuration`;
const openGlobalSettingsCommand = "workbench.action.openGlobalSettings";
const openWorkspaceSettingsCommand = "workbench.action.openWorkspaceSettings";
const openFolderSettingsCommand = "workbench.action.openFolderSettings";
const openCommand = "vscode.open";
const throttleDuration = 500;
const customRuleExtensionPrefixRe = /^\{([^}]+)\}\/(.*)$/iu;

// Variables
const ruleNameToInformationUri = {};
let outputChannel = null;
let diagnosticCollection = null;
let configMap = {};
let runMap = {};
let customRules = null;
let ignores = null;
let lintingEnabled = true;
const throttle = {
	"document": null,
	"timeout": null
};

function getWorkspacePath () {
	return vscode.workspace.workspaceFolders ?
		vscode.workspace.workspaceFolders[0].uri.fsPath :
		"";
}

// Writes date and message to the output channel
function outputLine (message, show) {
	const datePrefix = "[" + (new Date()).toLocaleTimeString() + "] ";
	outputChannel.appendLine(datePrefix + message);
	if (show) {
		outputChannel.show();
	}
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
					outputLine("INFO: Loading custom configuration from \"" + configFilePath +
						"\", overrides user/workspace/custom configuration for directory and its children.");
					try {
						return (configMap[dir] = {
							"config": markdownlint.readConfigSync(configFilePath, configParsers),
							"source": configFilePath
						});
					} catch (ex) {
						outputLine("ERROR: Unable to read configuration file \"" +
							configFilePath + "\" (" + (ex.message || ex.toString()) + ").", true);
					}
				}
			}
			// Remember missing or invalid file
			configMap[dir] = null;
		}
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

	// Use user/workspace configuration
	outputLine("INFO: Loading user/workspace configuration for \"" + name + "\" (" + workspaceDetail + ").");
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	const sectionConfig = "config";
	let userWorkspaceConfig = configuration.get(sectionConfig);
	const userWorkspaceConfigMetadata = configuration.inspect(sectionConfig);
	let source = null;
	let extendBase = getWorkspacePath();
	if (userWorkspaceConfigMetadata.workspaceFolderValue && (vscode.workspace.workspaceFolders.length > 1)) {
		// Length check to work around https://github.com/Microsoft/vscode/issues/34386
		source = openFolderSettingsCommand;
	} else if (userWorkspaceConfigMetadata.workspaceValue) {
		source = openWorkspaceSettingsCommand;
	} else if (userWorkspaceConfigMetadata.globalValue) {
		source = openGlobalSettingsCommand;
		extendBase = require("os").homedir();
	}

	// Bootstrap extend behavior into readConfigSync
	if (userWorkspaceConfig && userWorkspaceConfig.extends) {
		const extendPath = path.resolve(extendBase, userWorkspaceConfig.extends);
		try {
			const extendConfig = markdownlint.readConfigSync(extendPath, configParsers);
			userWorkspaceConfig = {
				...extendConfig,
				...userWorkspaceConfig
			};
		} catch (ex) {
			outputLine("ERROR: Unable to extend configuration file \"" +
				extendPath + "\" (" + (ex.message || ex.toString()) + ").", true);
		}
	}
	return (configMap[name] = {
		"config": {
			...defaultConfig,
			...userWorkspaceConfig
		},
		source
	});
}

// Clears the map of custom configuration files and re-lints files
function clearConfigMap (eventUri) {
	const source = eventUri ?
		`"${eventUri.fsPath}"` :
		"setting";
	outputLine(`INFO: Resetting configuration cache due to ${source} change.`);
	configMap = {};
	if (eventUri) {
		cleanLintVisibleFiles();
	}
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
			const workspacePath = getWorkspacePath();
			const allowPaths = configuration.get(sectionCustomRulesAlwaysAllow);
			const customRulesMetadata = configuration.inspect(sectionCustomRules);
			const showWarning = customRulesMetadata.workspaceValue && !allowPaths.includes(workspacePath);
			const promise = showWarning ?
				vscode.window.showWarningMessage(
					"This workspace includes custom rules for Markdown linting. " +
					"Custom rules include JavaScript that runs within VS Code. " +
					"Only allow custom rules if you trust the workspace.",
					// eslint-disable-next-line function-call-argument-newline
					itemAllow, itemAlwaysAllow, itemBlock
				) :
				Promise.resolve(itemAllow);
			promise.then((response) => {
				// Re-clear customRules array to avoid double-pushing in a race condition
				customRules = [];
				if (response === itemAlwaysAllow) {
					allowPaths.push(workspacePath);
					configuration.update(sectionCustomRulesAlwaysAllow, allowPaths, vscode.ConfigurationTarget.Global);
				}
				if ((response === itemAllow) || (response === itemAlwaysAllow)) {
					customRulesPaths.forEach((rulePath) => {
						let resolvedPath = null;
						try {
							const match = customRuleExtensionPrefixRe.exec(rulePath);
							if (match) {
								const extensionName = match[1];
								const relativePath = match[2];
								const extension = vscode.extensions.getExtension(extensionName);
								if (!extension) {
									throw new Error(`Extension "${extensionName}" not installed`);
								}
								resolvedPath = path.resolve(extension.extensionPath, relativePath);
							} else {
								resolvedPath = path.resolve(workspacePath, rulePath);
							}
							const exports = nodeRequire(resolvedPath);
							const rules = Array.isArray(exports) ?
								exports :
								[ exports ];
							rules.forEach((rule) => {
								if (rule.names && rule.description && rule.tags && rule.function) {
									customRules.push(rule);
								} else {
									outputLine(`WARNING: Skipping invalid custom rule "${JSON.stringify(rule)}".`, true);
								}
							});
							outputLine(`INFO: Loaded custom rules from "${resolvedPath}".`);
						} catch (ex) {
							outputLine("ERROR: Unable to load custom rules from \"" + (resolvedPath || rulePath) +
								"\" (" + (ex.message || ex.toString()) + ").", true);
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
		// Handle .markdownlintignore
		const workspacePath = getWorkspacePath();
		const ignoreFilePath = path.join(workspacePath, ignoreFileName);
		if (fs.existsSync(ignoreFilePath)) {
			const ignoreText = fs.readFileSync(ignoreFilePath, "utf8");
			// @ts-ignore
			const ignoreInstance = ignore().add(ignoreText);
			ignores.push((file) => ignoreInstance.ignores(file));
		}
		// Handle "ignore" configuration
		const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
		const ignorePaths = configuration.get("ignore");
		ignorePaths.forEach((ignorePath) => {
			const ignoreRe = require("minimatch").makeRe(ignorePath, {
				"dot": true,
				"nocomment": true
			});
			if (ignoreRe) {
				ignores.push((file) => ignoreRe.test(file));
			}
		});
	}
	return ignores;
}

// Clears the ignore list
function clearIgnores (eventUri) {
	const source = eventUri ?
		`"${eventUri.fsPath}"` :
		"setting";
	outputLine(`INFO: Resetting ignore configuration due to ${source} change.`);
	ignores = null;
	if (eventUri) {
		cleanLintVisibleFiles();
	}
}

// Wraps getting options and calling into markdownlint
function markdownlintWrapper (name, text, config) {
	const options = {
		"strings": {
			[name]: text
		},
		config,
		"customRules": getCustomRules(),
		"handleRuleFailures": true,
		"markdownItPlugins": [
			[
				require("markdown-it-texmath"),
				{
					"engine": {
						"renderToString": () => ""
					}
				}
			]
		],
		"resultVersion": 3
	};
	let results = [];
	try {
		results = markdownlint.sync(options)[name];
	} catch (ex) {
		outputLine("ERROR: Exception while linting:\n" + ex.stack, true);
	}
	return results;
}

// Returns if the document is Markdown
function isMarkdownDocument (document) {
	return (
		(document.languageId === markdownLanguageId) &&
		(
			(document.uri.scheme === markdownSchemeFile) ||
			(document.uri.scheme === markdownSchemeUntitled)
		)
	);
}

// Lints a Markdown document
function lint (document) {
	if (!lintingEnabled || !isMarkdownDocument(document)) {
		return;
	}
	// Check ignore list
	const diagnostics = [];
	const relativePath = vscode.workspace.asRelativePath(document.uri, false);
	const normalizedPath = relativePath.split(path.sep).join("/");
	if (getIgnores().every((ignoreTest) => !ignoreTest(normalizedPath))) {
		// Lint
		const name = document.uri.toString();
		const text = document.getText();
		const {config, source} = getConfig(document);
		markdownlintWrapper(name, text, config).forEach((result) => {
			// Create Diagnostics
			const ruleName = result.ruleNames[0];
			const ruleDescription = result.ruleDescription;
			const ruleInformationUri = result.ruleInformation && vscode.Uri.parse(result.ruleInformation);
			ruleNameToInformationUri[ruleName] = ruleInformationUri;
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
			diagnostic.code = ruleInformationUri ?
				{
					"value": ruleName,
					"target": ruleInformationUri
				} :
				ruleName;
			diagnostic.source = extensionDisplayName;
			// @ts-ignore
			diagnostic.configSource = source;
			// @ts-ignore
			diagnostic.fixInfo = result.fixInfo;
			diagnostics.push(diagnostic);
		});
	}
	// Publish
	diagnosticCollection.set(document.uri, diagnostics);
}

// Implements CodeActionsProvider.provideCodeActions to provide information and fix rule violations
function provideCodeActions (document, range, codeActionContext) {
	const codeActions = [];
	const diagnostics = codeActionContext.diagnostics || [];
	const fixInfoDiagnostics = [];
	let showConfigureInfo = false;
	let configSource = null;
	diagnostics
		.filter((diagnostic) => diagnostic.source === extensionDisplayName)
		.forEach((diagnostic) => {
			const ruleName = diagnostic.code.value || diagnostic.code;
			const ruleNameAlias = diagnostic.message.split(":")[0];
			// Provide code action to fix the violation
			if (diagnostic.fixInfo) {
				const fixTitle = clickToFix + ruleNameAlias;
				const fixAction = new vscode.CodeAction(fixTitle, codeActionKindQuickFix);
				fixAction.command = {
					"title": fixTitle,
					"command": fixLineCommandName,
					"arguments": [
						diagnostic.range.start.line,
						diagnostic.fixInfo
					]
				};
				fixAction.diagnostics = [ diagnostic ];
				fixAction.isPreferred = true;
				codeActions.push(fixAction);
				fixInfoDiagnostics.push(diagnostic);
			}
			// Provide code action for information about the violation
			const ruleInformationUri = ruleNameToInformationUri[ruleName];
			if (ruleInformationUri) {
				const infoTitle = clickForInfo + ruleNameAlias;
				const infoAction = new vscode.CodeAction(infoTitle, codeActionKindQuickFix);
				infoAction.command = {
					"title": infoTitle,
					"command": openCommand,
					"arguments": [ ruleInformationUri ]
				};
				infoAction.diagnostics = [ diagnostic ];
				codeActions.push(infoAction);
			}
			showConfigureInfo = true;
			configSource = configSource || diagnostic.configSource;
		});
	if (fixInfoDiagnostics.length) {
		// Register a "fix all" code action
		const sourceFixAllAction = new vscode.CodeAction(
			fixAllCommandTitle,
			codeActionKindSourceFixAll
		);
		sourceFixAllAction.command = {
			"title": fixAllCommandTitle,
			"command": fixAllCommandName
		};
		sourceFixAllAction.diagnostics = fixInfoDiagnostics;
		codeActions.push(sourceFixAllAction);
	}
	// Open the source for the document's rule configuration
	if (configSource) {
		const configSourceIsSettings =
			(configSource === openGlobalSettingsCommand) ||
			(configSource === openWorkspaceSettingsCommand) ||
			(configSource === openFolderSettingsCommand);
		const infoAction = new vscode.CodeAction(clickForConfigSource, codeActionKindQuickFix);
		infoAction.command = {
			"title": clickForConfigSource,
			"command": configSourceIsSettings ?
				configSource :
				openCommand,
			"arguments": configSourceIsSettings ?
				null :
				[ vscode.Uri.file(configSource) ]
		};
		codeActions.push(infoAction);
	}
	// Add information about configuring rules
	if (showConfigureInfo) {
		const configureInfoAction = new vscode.CodeAction(clickForConfigureInfo, codeActionKindQuickFix);
		configureInfoAction.command = {
			"title": clickForConfigureInfo,
			"command": openCommand,
			"arguments": [ vscode.Uri.parse(clickForConfigureUrl) ]
		};
		codeActions.push(configureInfoAction);
	}
	return codeActions;
}

// Fixes violations of a rule on a line
function fixLine (lineIndex, fixInfo) {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		if (editor && fixInfo) {
			const document = editor.document;
			const lineNumber = fixInfo.lineNumber || (lineIndex + 1);
			const {text, range} = document.lineAt(lineNumber - 1);
			const fixedText = markdownlintRuleHelpers.applyFix(text, fixInfo, "\n");
			return editor.edit((editBuilder) => {
				if (typeof fixedText === "string") {
					editBuilder.replace(range, fixedText);
				} else {
					let deleteRange = range;
					if (lineNumber === 1) {
						if (document.lineCount > 1) {
							const nextLine = document.lineAt(range.end.line + 1);
							deleteRange = range.with({"end": nextLine.range.start});
						}
					} else {
						const previousLine = document.lineAt(range.start.line - 1);
						deleteRange = range.with({"start": previousLine.range.end});
					}
					editBuilder.delete(deleteRange);
				}
			}).then(resolve, reject);
		}
		return resolve();
	});
}

// Fixes all violations in the active document
function fixAll () {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			if (isMarkdownDocument(document)) {
				const name = document.uri.toString();
				const text = document.getText();
				const {config} = getConfig(document);
				const errors = markdownlintWrapper(name, text, config);
				const fixedText = markdownlintRuleHelpers.applyFixes(text, errors);
				if (text !== fixedText) {
					return editor.edit((editBuilder) => {
						const start = document.lineAt(0).range.start;
						const end = document.lineAt(document.lineCount - 1).range.end;
						editBuilder.replace(new vscode.Range(start, end), fixedText);
					}).then(resolve, reject);
				}
			}
		}
		return resolve();
	});
}

// Creates or opens the markdownlint configuration file for the folder
function openConfigFile () {
	const workspacePath = getWorkspacePath();
	Promise.all(configFileNames.map((configFileName) => {
		const filePath = path.join(workspacePath, configFileName);
		const fileUri = vscode.Uri.file(filePath);
		return vscode.workspace.fs.stat(fileUri).then(
			() => fileUri,
			() => null
		);
	})).then((fileUris) => {
		const validFilePaths = fileUris.filter((filePath) => filePath !== null);
		if (validFilePaths.length) {
			// File exists, open it
			vscode.window.showTextDocument(validFilePaths[0]);
		} else {
			// File does not exist, create one
			const filePath = path.join(workspacePath, markdownlintJson);
			const fileUri = vscode.Uri.file(filePath);
			const newFileUri = fileUri.with({"scheme": "untitled"});
			vscode.window.showTextDocument(newFileUri).then(
				(editor) => {
					editor.edit((editBuilder) => {
						editBuilder.insert(new vscode.Position(0, 0), "{}");
					}).then(() => {
						editor.selection = new vscode.Selection(0, 1, 0, 1);
					});
				}
			);
		}
	});
}

// Toggles linting on/off
function toggleLinting () {
	lintingEnabled = !lintingEnabled;
	cleanLintVisibleFiles();
}

// Cleanly (i.e., from scratch) lint all visible files
function cleanLintVisibleFiles () {
	diagnosticCollection.clear();
	didChangeVisibleTextEditors(vscode.window.visibleTextEditors);
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
	outputLine("INFO: Linting for \"" + document.fileName + "\" will be run \"" + runMap[name] + "\".");
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
function didChangeConfiguration (change) {
	if (change.affectsConfiguration(extensionDisplayName)) {
		clearConfigMap();
		clearRunMap();
		clearCustomRules();
		clearIgnores();
		cleanLintVisibleFiles();
	}
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
	const codeActionProvider = {
		provideCodeActions
	};
	const codeActionProviderMetadata = {
		"providedCodeActionKinds": [
			codeActionKindQuickFix,
			codeActionKindSourceFixAll
		]
	};
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(documentSelectors, codeActionProvider, codeActionProviderMetadata)
	);

	// Register Commands
	context.subscriptions.push(
		vscode.commands.registerCommand(fixAllCommandName, fixAll),
		vscode.commands.registerCommand(fixLineCommandName, fixLine),
		vscode.commands.registerCommand(openConfigFileCommandName, openConfigFile),
		vscode.commands.registerCommand(toggleLintingCommandName, toggleLinting)
	);

	// Create DiagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionDisplayName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file(s) ("/" vs. "\" due to bug in VS Code glob)
	const workspacePath = getWorkspacePath();
	const relativeConfigFileGlob = new vscode.RelativePattern(workspacePath, "**/" + configFileGlob);
	const configWatcher = vscode.workspace.createFileSystemWatcher(relativeConfigFileGlob);
	context.subscriptions.push(
		configWatcher,
		configWatcher.onDidCreate(clearConfigMap),
		configWatcher.onDidChange(clearConfigMap),
		configWatcher.onDidDelete(clearConfigMap)
	);
	const relativeIgnoreFilePath = new vscode.RelativePattern(workspacePath, ignoreFileName);
	const ignoreWatcher = vscode.workspace.createFileSystemWatcher(relativeIgnoreFilePath);
	context.subscriptions.push(
		ignoreWatcher,
		ignoreWatcher.onDidCreate(clearIgnores),
		ignoreWatcher.onDidChange(clearIgnores),
		ignoreWatcher.onDidDelete(clearIgnores)
	);

	// Cancel any pending operations during deactivation
	context.subscriptions.push({
		"dispose": () => suppressLint(throttle.document)
	});

	// Lint all visible documents
	setTimeout(cleanLintVisibleFiles, throttleDuration);
}

exports.activate = activate;
