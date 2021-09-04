"use strict";

// Minimal requires (requires that may not be needed are inlined to avoid startup cost)
const vscode = require("vscode");
const markdownlint = require("markdownlint");
const path = require("path");
const pify = require("pify");
// Node modules (like path) are not available in web worker context
const nodeModulesAvailable = path && (Object.keys(path).length > 0);

// Constants
const extensionDisplayName = "markdownlint";
const configFileGlob = ".markdownlint.{jsonc,json,yaml,yml,js}";
const optionsFileGlob = ".markdownlint-cli2.{jsonc,yaml,js}";
const markdownlintJson = ".markdownlint.json";
const configFileNames = [
	".markdownlint.jsonc",
	markdownlintJson,
	".markdownlint.yaml",
	".markdownlint.yml",
	".markdownlint.js"
];
const ignoreFileName = ".markdownlintignore";
const markdownLanguageId = "markdown";
const markdownSchemeFile = "file";
const markdownSchemeUntitled = "untitled";
const configParsers = [
	(content) => JSON.parse(require("jsonc-parser").stripComments(content)),
	(content) => require("js-yaml").load(content)
];
const codeActionKindQuickFix = vscode.CodeActionKind.QuickFix;
const codeActionKindSourceFixAll = vscode.CodeActionKind.SourceFixAll;
const codeActionKindSourceFixAllExtension = codeActionKindSourceFixAll.append(extensionDisplayName);
const defaultConfig = {
	"MD013": false
};

const clickForInfo = "More information about ";
const clickToFix = "Fix this violation of ";
const fixLineCommandName = "markdownlint.fixLine";
const fixAllCommandTitle = `Fix all supported ${extensionDisplayName} violations in this document`;
const fixAllCommandName = "markdownlint.fixAll";
const openConfigFileCommandName = "markdownlint.openConfigFile";
const toggleLintingCommandName = "markdownlint.toggleLinting";
const clickForConfigureInfo = `Details about configuring ${extensionDisplayName} rules`;
const clickForConfigureUrl = "https://github.com/DavidAnson/vscode-markdownlint#configure";
const openCommand = "vscode.open";
const sectionConfig = "config";
const sectionCustomRules = "customRules";
const sectionFocusMode = "focusMode";
const sectionIgnore = "ignore";
const sectionRun = "run";
const applicationConfigurationSections = [ sectionFocusMode ];
const throttleDuration = 500;
const customRuleExtensionPrefixRe = /^\{([^}]+)\}\/(.*)$/iu;

// Variables
const applicationConfiguration = {};
const ruleNameToInformationUri = {};
let outputChannel = null;
let diagnosticCollection = null;
let runMap = {};
let ignores = null;
let lintingEnabled = true;
const throttle = {
	"document": null,
	"timeout": null
};

// Escapes glob pattern characters
function escapeGlobPattern (glob) {
	return glob.replace(/[!#()*?[\\\]{}]/g, "\\$&");
}

// Converts to a POSIX-style path
// eslint-disable-next-line id-length
function posixPath (p) {
	return p.split(path.sep).join(path.posix.sep);
}

// Gets the primary workspace folder (if any)
function getWorkspaceFolder () {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	return (workspaceFolders && (workspaceFolders.length > 0)) ?
		workspaceFolders[0] :
		null;
}

// Gets the workspace file-system path (or HOMEDIR if none)
function getWorkspaceFsPath () {
	const workspaceFolder = getWorkspaceFolder();
	const workspaceFolderSchemeFile = workspaceFolder && (workspaceFolder.uri.scheme === markdownSchemeFile);
	return workspaceFolderSchemeFile ?
		workspaceFolder.uri.fsPath :
		require("os").homedir();
}

// Returns true iff the path segment is in the workspace
function isInWorkspace (pathSegment) {
	const workspaceFolder = getWorkspaceFolder();
	if (workspaceFolder) {
		const pathSegmentUri = workspaceFolder.uri.with({"path": pathSegment});
		return !vscode.workspace.asRelativePath(pathSegmentUri).startsWith("/");
	}
	return false;
}

// Returns true
function trueFunction () {
	return true;
}

// Returns false
function falseFunction () {
	return false;
}

// Joins a path to the current workspace folder URI
function joinPathSegmentToWorkspaceUri (pathSegment) {
	const workspaceFolder = getWorkspaceFolder();
	return (workspaceFolder && isInWorkspace(pathSegment)) ?
		workspaceFolder.uri.with({"path": pathSegment}) :
		vscode.Uri.file(pathSegment);
}

// Implements fs.access via vscode.workspace.fs
function fsAccess (pathSegment, mode, callback) {
	// eslint-disable-next-line no-param-reassign
	callback = callback || mode;
	vscode.workspace.fs.stat(
		joinPathSegmentToWorkspaceUri(pathSegment)
	).then(
		() => callback(null),
		callback
	);
}

// Implements fs.readFile via vscode.workspace.fs
function fsReadFile (pathSegment, options, callback) {
	// eslint-disable-next-line no-param-reassign
	callback = callback || options;
	vscode.workspace.fs.readFile(
		joinPathSegmentToWorkspaceUri(pathSegment)
	).then(
		(bytes) => callback(null, new TextDecoder().decode(bytes)),
		callback
	);
}

// Implements fs.stat via vscode.workspace.fs
function fsStat (pathSegment, options, callback) {
	// eslint-disable-next-line no-param-reassign
	callback = callback || options;
	vscode.workspace.fs.stat(
		joinPathSegmentToWorkspaceUri(pathSegment)
	).then(
		(fileStat) => {
			// Stub required properties for fast-glob
			/* eslint-disable dot-notation, multiline-ternary, no-bitwise */
			fileStat["isBlockDevice"] = falseFunction;
			fileStat["isCharacterDevice"] = falseFunction;
			fileStat["isDirectory"] = (fileStat.type & vscode.FileType.Directory) ? trueFunction : falseFunction;
			fileStat["isFIFO"] = falseFunction;
			fileStat["isFile"] = (fileStat.type & vscode.FileType.File) ? trueFunction : falseFunction;
			fileStat["isSocket"] = falseFunction;
			fileStat["isSymbolicLink"] = (fileStat.type & vscode.FileType.SymbolicLink) ? trueFunction : falseFunction;
			/* eslint-enable dot-notation, multiline-ternary, no-bitwise */
			callback(null, fileStat);
		},
		callback
	);
}

// Creates a Node-like fs object based on vscode.workspace.fs
const workspaceFs = {
	"promises": {
		"access": pify(fsAccess),
		"readFile": pify(fsReadFile),
		"stat": pify(fsStat)
	},
	"access": fsAccess,
	"lstat": fsStat,
	"stat": fsStat,
	"readFile": fsReadFile
};

// Writes date and message to the output channel
function outputLine (message, show) {
	const datePrefix = "[" + (new Date()).toLocaleTimeString() + "] ";
	outputChannel.appendLine(datePrefix + message);
	if (show) {
		outputChannel.show(true);
	}
}

// Returns rule configuration from user/workspace configuration
function getConfig (configuration) {
	let userWorkspaceConfig = configuration.get(sectionConfig);
	// Bootstrap extend behavior into readConfigSync
	if (userWorkspaceConfig && userWorkspaceConfig.extends && nodeModulesAvailable) {
		const userWorkspaceConfigMetadata = configuration.inspect(sectionConfig);
		const extendBase = userWorkspaceConfigMetadata.globalValue ?
			require("os").homedir() :
			getWorkspaceFsPath();
		const extendPath = path.resolve(extendBase, userWorkspaceConfig.extends);
		try {
			const extendConfig = markdownlint.readConfigSync(extendPath, configParsers);
			userWorkspaceConfig = {
				...extendConfig,
				...userWorkspaceConfig
			};
		} catch {
			// Ignore error
		}
	}
	return {
		...defaultConfig,
		...userWorkspaceConfig
	};
}

// Returns ignore configuration for user/workspace
function getIgnores (document) {
	if (!Array.isArray(ignores)) {
		ignores = [];
		let ignoreFile = ignoreFileName;
		// Handle "ignore" configuration
		const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
		const ignoreValue = configuration.get(sectionIgnore);
		if (Array.isArray(ignoreValue)) {
			for (const ignorePath of ignoreValue) {
				const ignoreRe = require("minimatch").makeRe(ignorePath, {
					"dot": true,
					"nocomment": true
				});
				if (ignoreRe) {
					ignores.push((file) => ignoreRe.test(file));
				}
			}
		} else if (typeof ignoreValue === "string") {
			ignoreFile = ignoreValue;
		}
		// Handle .markdownlintignore
		const workspaceFolder = getWorkspaceFolder();
		if (workspaceFolder) {
			const ignoreFileUri = vscode.Uri.joinPath(
				workspaceFolder.uri,
				ignoreFile
			);
			vscode.workspace.fs.stat(ignoreFileUri).then(
				() => vscode.workspace.fs.readFile(ignoreFileUri).then(
					(ignoreBytes) => {
						const ignoreString = new TextDecoder().decode(ignoreBytes);
						const ignore = require("ignore").default;
						const ignoreInstance = ignore().add(ignoreString);
						ignores.push((file) => ignoreInstance.ignores(file));
						clearDiagnosticsAndLintVisibleFiles();
					}
				),
				() => null
			);
		}
	}
	return ignores;
}

// Clears the ignore list
function clearIgnores (eventUri) {
	const source = eventUri ?
		`"${eventUri.fsPath}"` :
		"setting";
	outputLine(`INFO: Resetting ignore cache due to ${source} change.`);
	ignores = null;
	if (eventUri) {
		clearDiagnosticsAndLintVisibleFiles();
	}
}

// Returns custom rule configuration for user/workspace
function getCustomRules (configuration) {
	const customRulesPaths = configuration.get(sectionCustomRules);
	const customRules = customRulesPaths.map((rulePath) => {
		const match = customRuleExtensionPrefixRe.exec(rulePath);
		if (match) {
			const [
				,
				extensionName,
				relativePath
			] = match;
			const extension = vscode.extensions.getExtension(extensionName);
			if (extension) {
				// eslint-disable-next-line no-param-reassign
				rulePath = posixPath(
					path.resolve(extension.extensionPath, relativePath)
				);
			}
		}
		return rulePath;
	});
	return customRules;
}

// Wraps getting options and calling into markdownlint-cli2
function markdownlintWrapper (document) {
	// Load user/workspace configuration
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	const config = getConfig(configuration);
	const text = document.getText();
	const markdownItPlugins = [
		[
			require("markdown-it-texmath"),
			{
				"engine": {
					"renderToString": () => ""
				}
			}
		]
	];
	if (nodeModulesAvailable) {
		// Prepare markdownlint-cli2 parameters
		const isSchemeUntitled = document.uri.scheme === markdownSchemeUntitled;
		const name = posixPath(document.uri.fsPath);
		const workspaceFolder = getWorkspaceFolder();
		// eslint-disable-next-line no-nested-ternary
		const directory = isSchemeUntitled ?
			null :
			((workspaceFolder && isInWorkspace(name)) ?
				posixPath(workspaceFolder.uri.fsPath) :
				path.posix.dirname(name));
		const argv = isSchemeUntitled ?
			[] :
			[ escapeGlobPattern(name) ];
		const contents = isSchemeUntitled ?
			"nonFileContents" :
			"fileContents";
		let results = [];
		// eslint-disable-next-line func-style
		const captureResultsFormatter = (options) => {
			results = options.results;
		};
		const parameters = {
			"fs": workspaceFs,
			directory,
			argv,
			[contents]: {
				[name]: text
			},
			"noRequire": !vscode.workspace.isTrusted,
			"optionsDefault": {
				config,
				"customRules": getCustomRules(configuration),
				markdownItPlugins
			},
			"optionsOverride": {
				"fix": false,
				"outputFormatters": [ [ captureResultsFormatter ] ]
			}
		};
		// Invoke markdownlint-cli2
		const {"main": markdownlintCli2} = require("markdownlint-cli2");
		return markdownlintCli2(parameters)
			.catch((error) => outputLine("ERROR: Exception while linting with markdownlint-cli2:\n" + error.stack, true))
			.then(() => results);
	}
	// Else invoke markdownlint (don't use markdownlint.promises.markdownlint which is invalid in web worker context)
	const options = {
		"strings": {
			text
		},
		config,
		markdownItPlugins,
		"resultVersion": 3
	};
	return pify(markdownlint)(options)
		.catch((error) => outputLine("ERROR: Exception while linting with markdownlint:\n" + error.stack, true))
		.then((results) => results.text);
}

// Returns if the document is Markdown
function isMarkdownDocument (document) {
	return (document.languageId === markdownLanguageId);
}

// Lints a Markdown document
function lint (document) {
	if (!lintingEnabled || !isMarkdownDocument(document)) {
		return;
	}
	// Check ignore list
	const diagnostics = [];
	let task = Promise.resolve();
	const relativePath = vscode.workspace.asRelativePath(document.uri, false);
	const normalizedPath = relativePath.split(path.sep).join("/");
	if (getIgnores(document).every((ignoreTest) => !ignoreTest(normalizedPath))) {
		// Lint
		task = markdownlintWrapper(document)
			.then((results) => {
				const {activeTextEditor} = vscode.window;
				for (const result of results) {
					// Create Diagnostics
					const lineNumber = result.lineNumber;
					if (
						!applicationConfiguration[sectionFocusMode] ||
						!activeTextEditor ||
						(activeTextEditor.document !== document) ||
						(activeTextEditor.selection.active.line !== (lineNumber - 1))
					) {
						const ruleName = result.ruleNames[0];
						const ruleDescription = result.ruleDescription;
						const ruleInformationUri = result.ruleInformation && vscode.Uri.parse(result.ruleInformation);
						ruleNameToInformationUri[ruleName] = ruleInformationUri;
						let message = result.ruleNames.join("/") + ": " + ruleDescription;
						if (result.errorDetail) {
							message += " [" + result.errorDetail + "]";
						}
						let range = document.lineAt(lineNumber - 1).range;
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
						diagnostic.fixInfo = result.fixInfo;
						diagnostics.push(diagnostic);
					}
				}
			});
	}
	// Publish
	task.then(() => diagnosticCollection.set(document.uri, diagnostics));
}

// Implements CodeActionsProvider.provideCodeActions to provide information and fix rule violations
function provideCodeActions (document, range, codeActionContext) {
	const codeActions = [];
	// eslint-disable-next-line func-style
	const addToCodeActions = (action) => {
		if (!codeActionContext.only || codeActionContext.only.contains(action.kind)) {
			codeActions.push(action);
		}
	};
	const diagnostics = codeActionContext.diagnostics || [];
	const fixInfoDiagnostics = [];
	let showConfigureInfo = false;
	const filteredDiagnostics = diagnostics.filter((diagnostic) => diagnostic.source === extensionDisplayName);
	for (const diagnostic of filteredDiagnostics) {
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
			addToCodeActions(fixAction);
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
			addToCodeActions(infoAction);
		}
		showConfigureInfo = true;
	}
	if (fixInfoDiagnostics.length > 0) {
		// eslint-disable-next-line func-style
		const registerFixAllCodeAction = (codeActionKind) => {
			// Register a "fix all" code action
			const sourceFixAllAction = new vscode.CodeAction(
				fixAllCommandTitle,
				codeActionKind
			);
			sourceFixAllAction.command = {
				"title": fixAllCommandTitle,
				"command": fixAllCommandName
			};
			sourceFixAllAction.diagnostics = fixInfoDiagnostics;
			addToCodeActions(sourceFixAllAction);
		};
		registerFixAllCodeAction(codeActionKindSourceFixAllExtension);
		registerFixAllCodeAction(codeActionKindQuickFix);
	}
	// Add information about configuring rules
	if (showConfigureInfo) {
		const configureInfoAction = new vscode.CodeAction(clickForConfigureInfo, codeActionKindQuickFix);
		configureInfoAction.command = {
			"title": clickForConfigureInfo,
			"command": openCommand,
			"arguments": [ vscode.Uri.parse(clickForConfigureUrl) ]
		};
		addToCodeActions(configureInfoAction);
	}
	return codeActions;
}

// Fixes violations of a rule on a line
function fixLine (lineIndex, fixInfo) {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		if (editor && fixInfo) {
			const markdownlintRuleHelpers = require("markdownlint-rule-helpers");
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
			})
				.then(() => {
					// Remove inappropriate selection that may have been added by editBuilder.replace
					const cursorPosition = editor.selection.active;
					editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
				})
				.then(resolve, reject);
		}
		return resolve();
	});
}

// Fixes all violations in the active document
function fixAll () {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const markdownlintRuleHelpers = require("markdownlint-rule-helpers");
			const document = editor.document;
			if (isMarkdownDocument(document)) {
				const text = document.getText();
				return markdownlintWrapper(document)
					.then((errors) => {
						const fixedText = markdownlintRuleHelpers.applyFixes(text, errors);
						return (text === fixedText) ?
							null :
							editor.edit((editBuilder) => {
								const start = document.lineAt(0).range.start;
								const end = document.lineAt(document.lineCount - 1).range.end;
								editBuilder.replace(new vscode.Range(start, end), fixedText);
							});
					})
					.then(resolve, reject);
			}
		}
		return resolve();
	});
}

// Creates or opens the markdownlint configuration file for the folder
function openConfigFile () {
	const workspaceFolder = getWorkspaceFolder();
	if (workspaceFolder) {
		const workspacePath = workspaceFolder.uri;
		Promise.all(configFileNames.map((configFileName) => {
			const fileUri = vscode.Uri.joinPath(workspacePath, configFileName);
			return vscode.workspace.fs.stat(fileUri).then(
				() => fileUri,
				() => null
			);
		})).then((fileUris) => {
			const validFilePaths = fileUris.filter((filePath) => filePath !== null);
			if (validFilePaths.length > 0) {
				// File exists, open it
				vscode.window.showTextDocument(validFilePaths[0]);
			} else {
				// File does not exist, create one
				const fileUri = vscode.Uri.joinPath(workspacePath, markdownlintJson);
				const untitledFileUri = fileUri.with({"scheme": markdownSchemeUntitled});
				vscode.window.showTextDocument(untitledFileUri).then(
					(editor) => {
						editor.edit((editBuilder) => {
							editBuilder.insert(
								new vscode.Position(0, 0),
								JSON.stringify(defaultConfig, null, 2)
							);
						});
					}
				);
			}
		});
	}
}

// Toggles linting on/off
function toggleLinting () {
	lintingEnabled = !lintingEnabled;
	clearDiagnosticsAndLintVisibleFiles();
}

// Clears diagnostics and lints all visible files
function clearDiagnosticsAndLintVisibleFiles (eventUri) {
	if (eventUri) {
		outputLine(`INFO: Re-linting due to "${eventUri.fsPath}" change.`);
	}
	diagnosticCollection.clear();
	lintVisibleFiles();
}

// Lints all visible files
function lintVisibleFiles () {
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
	runMap[name] = configuration.get(sectionRun);
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

// Reads all application-scoped configuration settings
function getApplicationConfiguration () {
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
	for (const section of applicationConfigurationSections) {
		applicationConfiguration[section] = configuration.get(section);
	}
}

// Handles the onDidChangeActiveTextEditor event
function didChangeActiveTextEditor () {
	if (applicationConfiguration[sectionFocusMode]) {
		lintVisibleFiles();
	}
}

// Handles the onDidChangeTextEditorSelection event
function didChangeTextEditorSelection (change) {
	const document = change.textEditor.document;
	if (isMarkdownDocument(document) && applicationConfiguration[sectionFocusMode]) {
		requestLint(document);
	}
}

// Handles the onDidChangeVisibleTextEditors event
function didChangeVisibleTextEditors (textEditors) {
	for (const textEditor of textEditors) {
		lint(textEditor.document);
	}
}

// Handles the onDidChangeTextDocument event
function didChangeTextDocument (change) {
	const document = change.document;
	if (isMarkdownDocument(document) && (getRun(document) === "onType")) {
		requestLint(document);
	}
}

// Handles the onDidSaveTextDocument event
function didSaveTextDocument (document) {
	if (isMarkdownDocument(document) && (getRun(document) === "onSave")) {
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
	if (!change || change.affectsConfiguration(extensionDisplayName)) {
		outputLine("INFO: Resetting configuration cache due to setting change.");
		getApplicationConfiguration();
		clearRunMap();
		clearIgnores();
		clearDiagnosticsAndLintVisibleFiles();
	}
}

// Handles the onDidGrantWorkspaceTrust event
function didGrantWorkspaceTrust () {
	didChangeConfiguration();
}

function activate (context) {
	// Create OutputChannel
	outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
	context.subscriptions.push(outputChannel);

	// Get application-level configuration
	getApplicationConfiguration();

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(didChangeActiveTextEditor),
		vscode.window.onDidChangeTextEditorSelection(didChangeTextEditorSelection),
		vscode.window.onDidChangeVisibleTextEditors(didChangeVisibleTextEditors),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidSaveTextDocument(didSaveTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(didChangeConfiguration),
		vscode.workspace.onDidGrantWorkspaceTrust(didGrantWorkspaceTrust)
	);

	// Register CodeActionsProvider
	const codeActionProvider = {
		provideCodeActions
	};
	const codeActionProviderMetadata = {
		"providedCodeActionKinds": [
			codeActionKindQuickFix,
			codeActionKindSourceFixAllExtension
		]
	};
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{"language": markdownLanguageId},
			codeActionProvider,
			codeActionProviderMetadata
		)
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

	// Hook up to file system changes for custom config file(s)
	const workspaceFolder = getWorkspaceFolder();
	if (workspaceFolder) {
		const workspacePath = workspaceFolder.uri;
		const relativeConfigFileGlob = new vscode.RelativePattern(workspacePath, "**/" + configFileGlob);
		const configWatcher = vscode.workspace.createFileSystemWatcher(relativeConfigFileGlob);
		context.subscriptions.push(
			configWatcher,
			configWatcher.onDidCreate(clearDiagnosticsAndLintVisibleFiles),
			configWatcher.onDidChange(clearDiagnosticsAndLintVisibleFiles),
			configWatcher.onDidDelete(clearDiagnosticsAndLintVisibleFiles)
		);
		const relativeOptionsFileGlob = new vscode.RelativePattern(workspacePath, "**/" + optionsFileGlob);
		const optionsWatcher = vscode.workspace.createFileSystemWatcher(relativeOptionsFileGlob);
		context.subscriptions.push(
			optionsWatcher,
			optionsWatcher.onDidCreate(clearDiagnosticsAndLintVisibleFiles),
			optionsWatcher.onDidChange(clearDiagnosticsAndLintVisibleFiles),
			optionsWatcher.onDidDelete(clearDiagnosticsAndLintVisibleFiles)
		);
		const relativeIgnoreFilePath = new vscode.RelativePattern(workspacePath, ignoreFileName);
		const ignoreWatcher = vscode.workspace.createFileSystemWatcher(relativeIgnoreFilePath);
		context.subscriptions.push(
			ignoreWatcher,
			ignoreWatcher.onDidCreate(clearIgnores),
			ignoreWatcher.onDidChange(clearIgnores),
			ignoreWatcher.onDidDelete(clearIgnores)
		);
	}

	// Cancel any pending operations during deactivation
	context.subscriptions.push({
		"dispose": () => suppressLint(throttle.document)
	});

	// Lint all visible documents
	setTimeout(clearDiagnosticsAndLintVisibleFiles, throttleDuration);
}

module.exports.activate = activate;
