"use strict";

// Requires
var vscode = require("vscode");
var markdownlint = require("markdownlint");
var opn = require("opn");
var fs = require("fs");
var path = require("path");
var packageJson = require("./package.json");
var defaultConfig = require("./default-config.json");

// Constants
var extensionName = packageJson.name;
var openLinkCommandName = extensionName + ".openLink";
var configFileName = ".markdownlint.json";
var markdownLanguageId = "markdown";
var markdownlintRulesMd = "https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md";
var codeActionPrefix = "Click for more information about ";
var badConfig = "Unable to read configuration file ";
var newLineRe = /\r\n|\r|\n/;
var resultLineRe = /^document: (\d+): (MD\d\d\d) (.*)$/;
var defaultLongLineLength = 80;

// Range expressions
function getLongLineRe (length) {
	return new RegExp("^(.{" + length + "})(.+)$");
}
var atxHeaderSpaceRe = /^\s*#+\s*?\S/;
var bareUrlRe = /(^|[^(])(https?:\/\/\S*)/;
var htmlRe = /<[^>]*>/;
var listItemMarkerRe = /^\s*(?:[\*\+\-]|\d+\.)\s*/;
var longLineRe = getLongLineRe(defaultLongLineLength);
var reversedLinkRe = /\([^)]+\)\[[^\]]+\]/;
var spaceAfterBlockQuote = />\s+\S/;
var spaceBeforeHeaderRe = /^\s+\S/;
var spaceInsideCodeRe = /`(?:(?:\s[^`]*)|(?:[^`]*\s))`/;
var spaceInsideEmphasisRe = /(\*\*?|__?)(?:(?:\s.+)|(?:.+\s))\1/;
var spaceInsideLinkRe = /\[(?:(?:\s[^\]]*)|(?:[^\]]*\s))\]\(\S*\)/;
var tabRe = /\t+/;
var trailingPunctuationRe = /.$/;
var trailingSpaceRe = /\s+$/;
var ruleRes = {
	"MD004": listItemMarkerRe,
	"MD005": listItemMarkerRe,
	"MD006": listItemMarkerRe,
	"MD007": listItemMarkerRe,
	"MD009": trailingSpaceRe,
	"MD010": tabRe,
	"MD011": reversedLinkRe,
	"MD013": longLineRe,
	"MD018": atxHeaderSpaceRe,
	"MD019": atxHeaderSpaceRe,
	"MD023": spaceBeforeHeaderRe,
	"MD026": trailingPunctuationRe,
	"MD027": spaceAfterBlockQuote,
	"MD029": listItemMarkerRe,
	"MD030": listItemMarkerRe,
	"MD033": htmlRe,
	"MD034": bareUrlRe,
	"MD037": spaceInsideEmphasisRe,
	"MD038": spaceInsideCodeRe,
	"MD039": spaceInsideLinkRe
};

// Variables
var diagnosticCollection = null;
var customConfig = null;

// Returns the range for a rule
function rangeForRule (rule, textLine) {
	var range = textLine.range;
	var ruleRe = ruleRes[rule];
	if (ruleRe) {
		var match = textLine.text.match(ruleRe);
		if (match) {
			var start = match.index;
			var end = start + match[0].length;
			if (match[2]) {
				start += match[1].length;
			}
			range = range.with(range.start.with(undefined, start), range.end.with(undefined, end));
		}
	}
	return range;
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
		"config": customConfig || defaultConfig
	};
	var diagnostics = [];

	// Lint and create Diagnostics
	markdownlint
		.sync(options)
		.toString()
		.split(newLineRe)
		.forEach(function forLine (line) {
			var match = line.match(resultLineRe);
			if (match) {
				var lineNumber = parseInt(match[1], 10) - 1;
				var rule = match[2];
				var description = match[3];
				var message = rule + ": " + description;
				var range = rangeForRule(rule, document.lineAt(lineNumber));
				var diagnostic = new vscode.Diagnostic(range, message, 1 /* Warning */);
				diagnostic.code = markdownlintRulesMd + "#" + rule.toLowerCase() + "---" + description.toLowerCase().replace(/ /g, "-");
				diagnostics.push(diagnostic);
			}
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
			"command": openLinkCommandName,
			"arguments": [ diagnostic.code ]
		};
	});
}

// Loads custom rule configuration
function loadCustomConfig () {
	customConfig = null;
	var rootPath = vscode.workspace.rootPath;
	if (rootPath) {
		var configFilePath = path.join(rootPath, configFileName);
		if (fs.existsSync(configFilePath)) {
			try {
				customConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
				var md013 = customConfig && customConfig.MD013;
				var lineLength = (md013 && md013.line_length) || defaultLongLineLength;
				ruleRes.MD013 = getLongLineRe(lineLength);
			} catch (ex) {
				vscode.window.showWarningMessage(badConfig + "'" + configFilePath + "' (" + (ex.message || ex.toString()) + ")");
			}
		}
	}

	// Re-lint all open files
	(vscode.workspace.textDocuments || []).forEach(lint);
}

// Handles the didChangeTextDocument event
function didChangeTextDocument (change) {
	lint(change.document);
}

// Opens a link in the default web browser (sanitizing function arguments for opn)
function openLink (link) {
	opn(link);
}

function activate (context) {
	// Hook up to workspace events
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(lint));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(didChangeTextDocument));

	// Register CodeActionsProvider
	context.subscriptions.push(vscode.commands.registerCommand(openLinkCommandName, openLink));
	context.subscriptions.push(vscode.languages.registerCodeActionsProvider(markdownLanguageId, {
		"provideCodeActions": provideCodeActions
	}));

	// Create DiagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
	context.subscriptions.push(diagnosticCollection);

	// Hook up to file system changes for custom config file
	var rootPath = vscode.workspace.rootPath;
	if (rootPath) {
		var fileSystemWatcher = vscode.workspace.createFileSystemWatcher(path.join(rootPath, configFileName));
		context.subscriptions.push(fileSystemWatcher);
		context.subscriptions.push(fileSystemWatcher.onDidCreate(loadCustomConfig));
		context.subscriptions.push(fileSystemWatcher.onDidChange(loadCustomConfig));
		context.subscriptions.push(fileSystemWatcher.onDidDelete(loadCustomConfig));
	}

	// Load custom rule config
	loadCustomConfig();
}

exports.activate = activate;
