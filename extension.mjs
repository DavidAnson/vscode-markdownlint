// @ts-check

"use strict";

// Minimal imports (requires that may not be needed are inlined to reduce startup cost)
import vscode from "vscode";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { "main" as markdownlintCli2 } from "markdownlint-cli2";
import { applyFix, applyFixes } from "markdownlint-cli2/markdownlint";
import { readConfig } from "markdownlint-cli2/markdownlint/promise";
// eslint-disable-next-line unicorn/no-keyword-prefix
import helpers from "markdownlint-cli2/markdownlint/helpers";
const { expandTildePath, newLineRe } = helpers;
import parsers from "markdownlint-cli2/parsers";

// Constants
const extensionDisplayName = "markdownlint";
const configFileGlob = ".markdownlint.{jsonc,json,yaml,yml,cjs}";
const optionsFileGlob = ".markdownlint-cli2.{jsonc,yaml,cjs}";
const markdownlintJson = ".markdownlint.json";
const configFileNames = [
	".markdownlint-cli2.jsonc",
	".markdownlint-cli2.yaml",
	".markdownlint-cli2.cjs",
	".markdownlint.jsonc",
	markdownlintJson,
	".markdownlint.yaml",
	".markdownlint.yml",
	".markdownlint.cjs"
];
// Untitled/unsaved document
const schemeUntitled = "untitled";
// Standard file system workspace
const schemeFile = "file";
// Used by extensions:
//   GitHub Repositories (github.remotehub)
//   Remote Repositories (ms-vscode.remote-repositories)
const schemeVscodeVfs = "vscode-vfs";
// Used by @vscode/test-web when testing web extensions
const schemeVscodeTestWeb = "vscode-test-web";
// Used by GistPad (vsls-contrib.gistfs)
const schemeGist = "gist";
// Schemes that are okay to lint (as part of a workspace or independently)
const schemeSupported = new Set([
	schemeUntitled,
	schemeFile,
	schemeVscodeVfs,
	schemeVscodeTestWeb,
	schemeGist
]);
// Schemes that are file system-like (support probing for configuration files)
const schemeFileSystemLike = new Set([
	schemeFile,
	schemeVscodeVfs,
	schemeVscodeTestWeb
]);
const codeActionKindQuickFix = vscode.CodeActionKind.QuickFix;
const codeActionKindSourceFixAll = vscode.CodeActionKind.SourceFixAll;
const codeActionKindSourceFixAllExtension = codeActionKindSourceFixAll.append(extensionDisplayName);
const defaultConfig = {
	"MD013": false
};

const clickForInfo = "More information about ";
const clickToFixThis = "Fix this violation of ";
const clickToFixRulePrefix = "Fix all violations of ";
const inTheDocument = " in the document";
const fixLineCommandName = "markdownlint.fixLine";
const fixAllCommandTitle = `Fix all supported ${extensionDisplayName} violations${inTheDocument}`;
const fixAllCommandName = "markdownlint.fixAll";
const lintWorkspaceCommandName = "markdownlint.lintWorkspace";
const openConfigFileCommandName = "markdownlint.openConfigFile";
const toggleLintingCommandName = "markdownlint.toggleLinting";
const lintAllTaskName = `Lint all Markdown files in the workspace with ${extensionDisplayName}`;
const problemMatcherName = `$${extensionDisplayName}`;
const clickForConfigureInfo = `Details about configuring ${extensionDisplayName} rules`;
const clickForConfigureUrl = "https://github.com/DavidAnson/vscode-markdownlint#configure";
const errorExceptionPrefix = "Exception while linting with markdownlint-cli2:\n";
const openCommand = "vscode.open";
const sectionConfig = "config";
const sectionLanguages = "languages";
const sectionCustomRules = "customRules";
const sectionFocusMode = "focusMode";
const sectionLintWorkspaceGlobs = "lintWorkspaceGlobs";
const sectionRun = "run";
const applicationConfigurationSections = [ sectionFocusMode ];
const throttleDuration = 500;
const customRuleExtensionPrefixRe = /^\{([^}]+)\}\/(.*)$/iu;
const driveLetterRe = /^[A-Za-z]:[/\\]/;
const networkShareRe = /^\\\\[^\\]+\\/;
const firstSegmentRe = /^\/{1,2}[^/]+\//;

// Variables
/** @type {Object.<string, any>} */
const applicationConfiguration = {};
/** @type {Object.<string, vscode.Uri>} */
const ruleNameToInformationUri = {};
/** @type {Map<string, Array<vscode.Disposable>>} */
const workspaceFolderUriToDisposables = new Map();
let outputChannel = null;
let outputChannelShown = false;
let diagnosticCollection = null;
let diagnosticGeneration = 0;
/** @type {Object.<string, string>} */
let runMap = {};
let lintingEnabled = true;
const throttle = {
	"document": null,
	"timeout": null
};

// Converts to a POSIX-style path
// eslint-disable-next-line id-length
function posixPath (p) {
	return p.split(path.sep).join(path.posix.sep);
}

// Gets the workspace folder Uri for the document Uri
function getDocumentWorkspaceFolderUri (documentUri) {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
	return workspaceFolder ?
		workspaceFolder.uri :
		vscode.Uri.joinPath(documentUri, "..");
}

// A Node-like fs object implemented using vscode.workspace.fs
class FsWrapper {
	// Returns true
	static fwTrue () {
		return true;
	}

	// Returns false
	static fwFalse () {
		return false;
	}

	// Returns a Uri of fwFolderUri with the specified path segment
	fwFolderUriWithPathSegment (pathSegment) {
		// Fix drive letter issues on Windows
		let posixPathSegment = posixPath(pathSegment);
		if (driveLetterRe.test(posixPathSegment)) {
			// eslint-disable-next-line unicorn/prefer-ternary
			if (
				this.fwFolderUri.path.startsWith("/") &&
				driveLetterRe.test(this.fwFolderUri.path.slice(1))
			) {
				// Both paths begin with Windows drive letter, make it consistent
				posixPathSegment = `/${posixPathSegment}`;
			} else {
				// Folder path does not start with Windows drive letter, remove it
				posixPathSegment = posixPathSegment.replace(driveLetterRe, "/");
			}
		}
		// Fix network share issues on Windows (possibly in addition to drive letter issues)
		if (networkShareRe.test(this.fwFolderUri.fsPath)) {
			// Path segment has the computer name prefixed, remove it
			posixPathSegment = posixPathSegment.replace(firstSegmentRe, "/");
		}
		// Return consistently-formatted Uri with specified path
		return this.fwFolderUri.with({ "path": posixPathSegment });
	}

	// Implements fs.access via vscode.workspace.fs
	fwAccess (pathSegment, mode, callback) {
		// eslint-disable-next-line no-param-reassign
		callback ||= mode;
		vscode.workspace.fs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			() => callback(null),
			callback
		);
	}

	// Implements fs.readdir via vscode.workspace.fs
	fwReaddir (pathSegment, options, callback) {
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.readDirectory(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(namesAndTypes) => {
				const namesOrDirents = namesAndTypes.map(
					(nameAndType) => {
						const [
							name,
							fileType
						] = nameAndType;
						return options.withFileTypes ?
							{
								/* eslint-disable no-bitwise */
								"isBlockDevice": FsWrapper.fwFalse,
								"isCharacterDevice": FsWrapper.fwFalse,
								"isDirectory": (fileType & vscode.FileType.Directory) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isFIFO": FsWrapper.fwFalse,
								"isFile": (fileType & vscode.FileType.File) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isSocket": FsWrapper.fwFalse,
								"isSymbolicLink":
									(fileType & vscode.FileType.SymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								/* eslint-enable no-bitwise */
								name
							} :
							name;
					}
				);
				callback(null, namesOrDirents);
			},
			callback
		);
	}

	// Implements fs.readFile via vscode.workspace.fs
	fwReadFile (pathSegment, options, callback) {
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.readFile(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(bytes) => callback(null, new TextDecoder().decode(bytes)),
			callback
		);
	}

	// Implements fs.stat via vscode.workspace.fs
	fwStat (pathSegment, options, callback) {
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(fileStat) => {
				// Stub required properties for fast-glob
				/* eslint-disable dot-notation, no-bitwise */
				fileStat["isBlockDevice"] = FsWrapper.fwFalse;
				fileStat["isCharacterDevice"] = FsWrapper.fwFalse;
				fileStat["isDirectory"] = (fileStat.type & vscode.FileType.Directory) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isFIFO"] = FsWrapper.fwFalse;
				fileStat["isFile"] = (fileStat.type & vscode.FileType.File) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isSocket"] = FsWrapper.fwFalse;
				fileStat["isSymbolicLink"] =
					(fileStat.type & vscode.FileType.SymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				/* eslint-enable dot-notation, no-bitwise */
				callback(null, fileStat);
			},
			callback
		);
	}

	// Constructs a new instance
	constructor (folderUri) {
		this.fwFolderUri = folderUri;
		this.access = this.fwAccess.bind(this);
		this.readdir = this.fwReaddir.bind(this);
		this.readFile = this.fwReadFile.bind(this);
		this.stat = this.fwStat.bind(this);
		this.lstat = this.stat;
		this.promises = {};
		this.promises.access = promisify(this.fwAccess).bind(this);
		this.promises.readFile = promisify(this.fwReadFile).bind(this);
		this.promises.stat = promisify(this.fwStat).bind(this);
	}
}

// A Node-like fs object for a "null" file system
class FsNull {
	// Implements fs.access/readdir/readFile/stat
	static fnError (pathSegment, modeOrOptions, callback) {
		// eslint-disable-next-line no-param-reassign
		callback ||= modeOrOptions;
		callback(new Error("FsNull.fnError"));
	}

	// Constructs a new instance
	constructor () {
		this.access = FsNull.fnError;
		this.readdir = this.access;
		this.readFile = this.access;
		this.stat = this.access;
		this.lstat = this.access;
		this.promises = {};
		this.promises.access = promisify(FsNull.fnError);
		this.promises.readFile = this.promises.access;
		this.promises.stat = this.promises.access;
	}
}

// A VS Code Pseudoterminal for linting a workspace and emitting the results
class LintWorkspacePseudoterminal {
	constructor () {
		this.writeEmitter = new vscode.EventEmitter();
		this.closeEmitter = new vscode.EventEmitter();
	}

	get onDidWrite () {
		return this.writeEmitter.event;
	}

	get onDidClose () {
		return this.closeEmitter.event;
	}

	open () {
		const logString = (message) => this.writeEmitter.fire(
			`${message.split(newLineRe).join("\r\n")}\r\n`
		);
		lintWorkspace(logString)
			.finally(() => this.close());
	}

	close () {
		this.writeEmitter.dispose();
		this.closeEmitter.fire();
		this.closeEmitter.dispose();
	}
}

// Writes time, importance, and message to the output channel
function outputLine (message, isError) {
	const time = (new Date()).toLocaleTimeString();
	const importance = isError ? "ERROR" : "INFO";
	outputChannel.appendLine(`[${time}] ${importance}: ${message}`);
	if (isError && !outputChannelShown) {
		outputChannelShown = true;
		outputChannel.show(true);
	}
}

// Returns rule configuration from user/workspace configuration
async function getConfig (fs, configuration, uri) {
	let userWorkspaceConfig = configuration.get(sectionConfig);
	// Bootstrap extend behavior into readConfig
	if (userWorkspaceConfig && userWorkspaceConfig.extends) {
		const userWorkspaceConfigMetadata = configuration.inspect(sectionConfig);
		const workspaceFolderUri = getDocumentWorkspaceFolderUri(uri);
		const useHomedir =
			// eslint-disable-next-line max-len
			(userWorkspaceConfigMetadata.globalValue && (userWorkspaceConfigMetadata.globalValue.extends === userWorkspaceConfig.extends)) ||
			(workspaceFolderUri.scheme !== schemeFile);
		const homedir = os && os.homedir && os.homedir();
		const workspaceFolderFsPath = posixPath(workspaceFolderUri.fsPath);
		const extendBase = ((useHomedir && homedir) ? homedir : workspaceFolderFsPath) || "";
		let expanded = expandTildePath(userWorkspaceConfig.extends, os);
		if (homedir) {
			expanded = expanded.replace(/\${userHome}/g, homedir);
		}
		expanded = expanded.replace(/\${workspaceFolder}/g, workspaceFolderFsPath);
		const extendPath = path.resolve(extendBase, expanded);
		try {
			const extendConfig = await readConfig(extendPath, parsers, fs);
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

// Gets the value of the optionsDefault parameter to markdownlint-cli2
async function getOptionsDefault (fs, workspaceConfiguration, config) {
	return {
		"config": config || await getConfig(fs, workspaceConfiguration),
		"customRules": getCustomRules(workspaceConfiguration)
	};
}

// Gets the value of the optionsOverride parameter to markdownlint-cli2
function getOptionsOverride () {
	return {
		"fix": false
	};
}

// Gets the value of the noImport parameter to markdownlint-cli2
function getNoImport (scheme) {
	const isTrusted = vscode.workspace.isTrusted;
	const isSchemeFile = (scheme === schemeFile);
	const isDesktop = Boolean(os && os.platform && os.platform());
	return !isTrusted || !isSchemeFile || !isDesktop;
}

// Wraps getting options and calling into markdownlint-cli2
async function markdownlintWrapper (document) {
	// Prepare markdownlint-cli2 parameters
	const scheme = document.uri.scheme;
	const independentDocument = !schemeFileSystemLike.has(scheme);
	const name = posixPath(document.uri.fsPath);
	const workspaceFolderUri = getDocumentWorkspaceFolderUri(document.uri);
	const fs = independentDocument ?
		new FsNull() :
		new FsWrapper(workspaceFolderUri);
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	const config = await getConfig(fs, configuration, document.uri);
	const directory = independentDocument ?
		null :
		posixPath(workspaceFolderUri.fsPath);
	const argv = independentDocument ?
		[] :
		[ `:${name}` ];
	const contents = independentDocument ?
		"nonFileContents" :
		"fileContents";
	let results = [];
	// eslint-disable-next-line func-style
	const captureResultsFormatter = (options) => {
		results = options.results;
	};
	const parameters = {
		fs,
		directory,
		argv,
		[contents]: {
			[name]: document.getText()
		},
		"noGlobs": true,
		"noImport": getNoImport(scheme),
		"optionsDefault": await getOptionsDefault(fs, configuration, config),
		"optionsOverride": {
			...getOptionsOverride(),
			"outputFormatters": [ [ captureResultsFormatter ] ]
		}
	};
	// Invoke markdownlint-cli2
	return markdownlintCli2(parameters)
		.catch((error) => import("./stringify-error.mjs").then(
			(stringifyError) => outputLine(errorExceptionPrefix + stringifyError.default(error), true)
		))
		.then(() => results);
	// If necessary some day to filter results by matching file name...
	// .then(() => results.filter((result) => isSchemeUntitled || (result.fileName === path.posix.relative(directory, name))))
}

// Returns if the document is Markdown
function isMarkdownDocument (document) {
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
	const configLanguages = configuration.get(sectionLanguages);
	return (
		// Document with supported language and URI scheme
		configLanguages.includes(document.languageId) &&
		schemeSupported.has(document.uri.scheme) &&
		(
			// Non-virtual document or document authority matches an open workspace
			(document.uri.scheme !== schemeVscodeVfs) ||
			vscode.workspace.workspaceFolders
				.filter((folder) => folder.uri.scheme === document.uri.scheme)
				.some((folder) => folder.uri.authority === document.uri.authority)
		)
	);
}

// Lints Markdown files in the workspace folder tree
function lintWorkspace (logString) {
	const workspaceFolderUris = (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri);
	return workspaceFolderUris.reduce(
		(previousPromise, workspaceFolderUri) => previousPromise.then(() => {
			logString(`Linting workspace folder "${workspaceFolderUri.toString()}"...`);
			const fs = new FsWrapper(workspaceFolderUri);
			const configuration = vscode.workspace.getConfiguration(extensionDisplayName, workspaceFolderUri);
			return getOptionsDefault(fs, configuration)
				.then((optionsDefault) => {
					const parameters = {
						fs,
						"argv": configuration.get(sectionLintWorkspaceGlobs),
						"directory": posixPath(workspaceFolderUri.fsPath),
						"logMessage": logString,
						"logError": logString,
						"noImport": getNoImport(workspaceFolderUri.scheme),
						optionsDefault,
						"optionsOverride": getOptionsOverride()
					};
					return markdownlintCli2(parameters)
						.catch((error) => import("./stringify-error.mjs").then(
							(stringifyError) => logString(errorExceptionPrefix + stringifyError.default(error))
						))
						.then(() => logString(""));
				});
		}),
		Promise.resolve()
	);
}

// Runs the lintWorkspace task to lint all Markdown files in the workspace
function lintWorkspaceViaTask () {
	return vscode.tasks.fetchTasks({ "type": extensionDisplayName })
		.then((tasks) => {
			const lintWorkspaceTask = tasks.find((task) => task.name === lintAllTaskName);
			return lintWorkspaceTask ?
				vscode.tasks.executeTask(lintWorkspaceTask) :
				Promise.reject(new Error("Unable to fetch task."));
		});
}

// Lints a Markdown document
function lint (document) {
	if (!lintingEnabled || !isMarkdownDocument(document)) {
		return;
	}
	const diagnostics = [];
	const targetGeneration = diagnosticGeneration;
	// Lint
	markdownlintWrapper(document)
		.then((results) => {
			const { activeTextEditor } = vscode.window;
			for (const result of results) {
				// Create Diagnostics
				const lineNumber = result.lineNumber;
				const focusMode = applicationConfiguration[sectionFocusMode];
				const focusModeRange = (!Number.isInteger(focusMode) || (focusMode < 0)) ?
					0 :
					focusMode;
				if (
					(applicationConfiguration[sectionFocusMode] === false) ||
					!activeTextEditor ||
					(activeTextEditor.document !== document) ||
					(activeTextEditor.selection.active.line < (lineNumber - focusModeRange - 1)) ||
					(activeTextEditor.selection.active.line > (lineNumber + focusModeRange - 1))
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
		})
		// Publish
		.then(() => {
			if (targetGeneration === diagnosticGeneration) {
				diagnosticCollection.set(document.uri, diagnostics);
			}
		});
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
	const extensionDiagnostics = diagnostics.filter((diagnostic) => diagnostic.source === extensionDisplayName);
	for (const diagnostic of extensionDiagnostics) {
		const ruleName = diagnostic.code.value || diagnostic.code;
		const ruleNameAlias = diagnostic.message.split(":")[0];
		if (diagnostic.fixInfo) {
			// Provide code action to fix the violation
			const fixTitle = clickToFixThis + ruleNameAlias;
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
			addToCodeActions(infoAction);
		}
		if (diagnostic.fixInfo) {
			// Provide code action to fix all similar violations
			const fixTitle = clickToFixRulePrefix + ruleNameAlias + inTheDocument;
			const fixAction = new vscode.CodeAction(fixTitle, codeActionKindQuickFix);
			fixAction.command = {
				"title": fixTitle,
				"command": fixAllCommandName,
				"arguments": [ ruleName ]
			};
			addToCodeActions(fixAction);
		}
	}
	if (extensionDiagnostics.length > 0) {
		// eslint-disable-next-line func-style
		const registerFixAllCodeAction = (codeActionKind) => {
			// Provide code action for fixing all violations
			const sourceFixAllAction = new vscode.CodeAction(
				fixAllCommandTitle,
				codeActionKind
			);
			sourceFixAllAction.command = {
				"title": fixAllCommandTitle,
				"command": fixAllCommandName
			};
			addToCodeActions(sourceFixAllAction);
		};
		registerFixAllCodeAction(codeActionKindSourceFixAllExtension);
		registerFixAllCodeAction(codeActionKindQuickFix);
		// Provide code action for information about configuring rules
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
			const document = editor.document;
			const lineNumber = fixInfo.lineNumber || (lineIndex + 1);
			const { text, range } = document.lineAt(lineNumber - 1);
			const fixedText = applyFix(text, fixInfo, "\n");
			return editor.edit((editBuilder) => {
				if (typeof fixedText === "string") {
					editBuilder.replace(range, fixedText);
				} else {
					let deleteRange = range;
					if (lineNumber === 1) {
						if (document.lineCount > 1) {
							const nextLine = document.lineAt(range.end.line + 1);
							deleteRange = range.with({ "end": nextLine.range.start });
						}
					} else {
						const previousLine = document.lineAt(range.start.line - 1);
						deleteRange = range.with({ "start": previousLine.range.end });
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
function fixAll (ruleNameFilter) {
	return new Promise((resolve, reject) => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			if (isMarkdownDocument(document)) {
				return markdownlintWrapper(document)
					.then((errors) => {
						const text = document.getText();
						const errorsToFix =
							errors.filter((error) => (!ruleNameFilter || (error.ruleNames[0] === ruleNameFilter)));
						const fixedText = applyFixes(text, errorsToFix);
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

// Formats a range of the document (applying fixes)
function formatDocument (document, range) {
	return new Promise((resolve, reject) => {
		if (isMarkdownDocument(document)) {
			return markdownlintWrapper(document)
				.then((errors) => {
					const rangeErrors = errors.filter((error) => {
						const { fixInfo } = error;
						if (fixInfo) {
							// eslint-disable-next-line unicorn/consistent-destructuring
							const line = error.lineNumber - 1;
							return ((range.start.line <= line) && (line <= range.end.line));
						}
						return false;
					});
					const text = document.getText();
					const fixedText = applyFixes(text, rangeErrors);
					const start = document.lineAt(0).range.start;
					const end = document.lineAt(document.lineCount - 1).range.end;
					return (text === fixedText) ?
						[] :
						[ vscode.TextEdit.replace(new vscode.Range(start, end), fixedText) ];
				})
				.then(resolve, reject);
		}
		return resolve();
	});
}

// Creates or opens the markdownlint configuration file for each workspace
function openConfigFile () {
	const workspaceFolderUris = (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri);
	for (const workspaceFolderUri of workspaceFolderUris) {
		Promise.all(configFileNames.map((configFileName) => {
			const fileUri = vscode.Uri.joinPath(workspaceFolderUri, configFileName);
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
				const fileUri = vscode.Uri.joinPath(workspaceFolderUri, markdownlintJson);
				const untitledFileUri = fileUri.with({ "scheme": schemeUntitled });
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
		outputLine(`Re-linting due to "${eventUri.fsPath}" change.`);
	}
	diagnosticCollection.clear();
	diagnosticGeneration++;
	outputChannelShown = false;
	lintVisibleFiles();
}

// Lints all visible files
function lintVisibleFiles () {
	didChangeVisibleTextEditors(vscode.window.visibleTextEditors);
}

// Returns the run setting for the document
function getRun (document) {
	const name = document.uri.toString();
	// Use cached configuration if present for file
	if (runMap[name]) {
		return runMap[name];
	}
	// Read workspace configuration
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName, document.uri);
	runMap[name] = configuration.get(sectionRun);
	outputLine("Linting for \"" + name + "\" will be run \"" + runMap[name] + "\".");
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
	if (applicationConfiguration[sectionFocusMode] !== false) {
		lintVisibleFiles();
	}
}

// Handles the onDidChangeTextEditorSelection event
function didChangeTextEditorSelection (change) {
	const document = change.textEditor.document;
	if (
		isMarkdownDocument(document) &&
		(applicationConfiguration[sectionFocusMode] !== false)
	) {
		requestLint(document);
	}
}

// Handles the onDidChangeVisibleTextEditors event
function didChangeVisibleTextEditors (textEditors) {
	for (const textEditor of textEditors) {
		lint(textEditor.document);
	}
}

// Handles the onDidOpenTextDocument event
function didOpenTextDocument (document) {
	if (isMarkdownDocument(document)) {
		lint(document);
		suppressLint(document);
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
		outputLine("Resetting configuration cache due to setting change.");
		getApplicationConfiguration();
		clearRunMap();
		clearDiagnosticsAndLintVisibleFiles();
	}
}

// Handles the onDidGrantWorkspaceTrust event
function didGrantWorkspaceTrust () {
	didChangeConfiguration();
}

// Creates all file system watchers for the specified workspace folder Uri
function createFileSystemWatchers (workspaceFolderUri) {
	disposeFileSystemWatchers(workspaceFolderUri);
	const relativeConfigFileGlob = new vscode.RelativePattern(workspaceFolderUri, "**/" + configFileGlob);
	const configWatcher = vscode.workspace.createFileSystemWatcher(relativeConfigFileGlob);
	const relativeOptionsFileGlob = new vscode.RelativePattern(workspaceFolderUri, "**/" + optionsFileGlob);
	const optionsWatcher = vscode.workspace.createFileSystemWatcher(relativeOptionsFileGlob);
	const workspaceFolderUriString = workspaceFolderUri.toString();
	workspaceFolderUriToDisposables.set(
		workspaceFolderUriString,
		[
			configWatcher,
			configWatcher.onDidCreate(clearDiagnosticsAndLintVisibleFiles),
			configWatcher.onDidChange(clearDiagnosticsAndLintVisibleFiles),
			configWatcher.onDidDelete(clearDiagnosticsAndLintVisibleFiles),
			optionsWatcher,
			optionsWatcher.onDidCreate(clearDiagnosticsAndLintVisibleFiles),
			optionsWatcher.onDidChange(clearDiagnosticsAndLintVisibleFiles),
			optionsWatcher.onDidDelete(clearDiagnosticsAndLintVisibleFiles)
		]
	);
}

// Disposes of all file system watchers for the specified workspace folder Uri
function disposeFileSystemWatchers (workspaceFolderUri) {
	const workspaceFolderUriString = workspaceFolderUri.toString();
	const disposables = workspaceFolderUriToDisposables.get(workspaceFolderUriString) || [];
	for (const disposable of disposables) {
		disposable.dispose();
	}
	workspaceFolderUriToDisposables.delete(workspaceFolderUriString);
}

// Handles the onDidChangeWorkspaceFolders event
function didChangeWorkspaceFolders (changes) {
	for (const workspaceFolderUri of changes.removed.map((folder) => folder.uri)) {
		disposeFileSystemWatchers(workspaceFolderUri);
	}
	for (const workspaceFolderUri of changes.added.map((folder) => folder.uri)) {
		createFileSystemWatchers(workspaceFolderUri);
	}
}

export function activate (context) {
	const configuration = vscode.workspace.getConfiguration(extensionDisplayName);
	let configLanguages = configuration.get(sectionLanguages);
	if (!vscode.workspace.textDocuments.some(doc => configLanguages.includes(doc.languageId))) {
		return;
	}
	// Create OutputChannel
	outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
	context.subscriptions.push(outputChannel);
	console.log(extensionDisplayName + " activated with languages: " + configLanguages.join(", ") + ".");
	outputChannel.appendLine(extensionDisplayName + " activated with languages: " + configLanguages.join(", ") + ".");

	// Get application-level configuration
	getApplicationConfiguration();

	// Hook up to workspace events
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(didChangeActiveTextEditor),
		vscode.window.onDidChangeTextEditorSelection(didChangeTextEditorSelection),
		vscode.window.onDidChangeVisibleTextEditors(didChangeVisibleTextEditors),
		vscode.workspace.onDidOpenTextDocument(didOpenTextDocument),
		vscode.workspace.onDidChangeTextDocument(didChangeTextDocument),
		vscode.workspace.onDidSaveTextDocument(didSaveTextDocument),
		vscode.workspace.onDidCloseTextDocument(didCloseTextDocument),
		vscode.workspace.onDidChangeConfiguration(didChangeConfiguration),
		vscode.workspace.onDidGrantWorkspaceTrust(didGrantWorkspaceTrust),
		vscode.workspace.onDidChangeWorkspaceFolders(didChangeWorkspaceFolders)
	);

	// Register CodeActionsProvider
	const documentSelector = configLanguages.map(language => ({ language }));
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
			documentSelector,
			codeActionProvider,
			codeActionProviderMetadata
		)
	);

	// Register DocumentRangeFormattingEditProvider
	const documentRangeFormattingEditProvider = {
		"provideDocumentRangeFormattingEdits": formatDocument
	};
	context.subscriptions.push(
		vscode.languages.registerDocumentRangeFormattingEditProvider(
			documentSelector,
			documentRangeFormattingEditProvider
		)
	);

	// Register TaskProvider
	const lintWorkspaceExecution = new vscode.CustomExecution(
		() => Promise.resolve(new LintWorkspacePseudoterminal())
	);
	const lintWorkspaceTask = new vscode.Task(
		{ "type": extensionDisplayName },
		vscode.TaskScope.Workspace,
		lintAllTaskName,
		extensionDisplayName,
		lintWorkspaceExecution,
		problemMatcherName
	);
	lintWorkspaceTask.presentationOptions = {
		"showReuseMessage": false
	};
	context.subscriptions.push(
		vscode.tasks.registerTaskProvider(
			extensionDisplayName,
			{
				"provideTasks": () => [ lintWorkspaceTask ],
				// eslint-disable-next-line unicorn/no-useless-undefined
				"resolveTask": () => undefined
			}
		)
	);

	// Register Commands
	context.subscriptions.push(
		vscode.commands.registerCommand(fixAllCommandName, fixAll),
		vscode.commands.registerCommand(fixLineCommandName, fixLine),
		vscode.commands.registerCommand(lintWorkspaceCommandName, lintWorkspaceViaTask),
		vscode.commands.registerCommand(openConfigFileCommandName, openConfigFile),
		vscode.commands.registerCommand(toggleLintingCommandName, toggleLinting)
	);

	// Create DiagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionDisplayName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file(s)
	didChangeWorkspaceFolders({
		"added": vscode.workspace.workspaceFolders || [],
		"removed": []
	});

	// Cancel any pending operations and dispose of all file system watchers during deactivation
	context.subscriptions.push({
		"dispose": () => {
			suppressLint(throttle.document);
			didChangeWorkspaceFolders({
				"added": [],
				"removed": vscode.workspace.workspaceFolders || []
			});
		}
	});

	// Lint all visible documents
	setTimeout(clearDiagnosticsAndLintVisibleFiles, throttleDuration);
}
