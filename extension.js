var vscode = require("vscode");
var markdownlint = require("markdownlint");
var opn = require("opn");
var packageJson = require("./package.json");
var defaultConfig = require("./default-config.json");

var extensionName = packageJson.name;
var openLinkCommandName = extensionName + ".openLink";
var markdownLanguageId = "markdown";
var markdownlintRulesMd = "https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md";
var newLineRe = /\r\n|\r|\n/;
var resultLineRe = /^document: (\d+): (MD\d\d\d) (.*)$/;
var messageCodeSuffixRe = /:.*$/;
var diagnosticCollection = null;

function lint(document) {
	if (document.languageId !== markdownLanguageId) {
		return;
	}

	var options = {
		"strings": {
			"document": document.getText()
		},
		"config": defaultConfig
	};
	var diagnostics = [];

	markdownlint
		.sync(options)
		.toString()
		.split(newLineRe)
		.forEach(function forLine(line) {
			var match = line.match(resultLineRe);
			if (match) {
				var lineNumber = parseInt(match[1], 10) - 1;
				var rule = match[2];
				var description = match[3];
				var message = rule + ": " + description;
				var diagnostic = new vscode.Diagnostic(document.lineAt(lineNumber).range, message, 1 /* Warning */);
				diagnostic.code = markdownlintRulesMd + "#" + rule.toLowerCase() + "---" + description.toLowerCase().replace(/ /g, "-");
				diagnostics.push(diagnostic);
			}
		});

	diagnosticCollection.set(document.uri, diagnostics);
}

function provideCodeActions(document, range, codeActionContext, cancellationToken) {
	var diagnostics = codeActionContext.diagnostics || [];
	return diagnostics.map(function forDiagnostic(diagnostic) {
		return {
			title: "More information about " + diagnostic.message.replace(messageCodeSuffixRe, "") + "...",
			command: openLinkCommandName,
			arguments: [ diagnostic.code ]
		}
	});
}

function activate(context) {	
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(function didOpenTextDocument(document) {
		lint(document);
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function didChangeTextDocument(change) {
		lint(change.document);
	}));
	context.subscriptions.push(vscode.languages.registerCodeActionsProvider(markdownLanguageId, {
		provideCodeActions: provideCodeActions
	}));
	context.subscriptions.push(vscode.commands.registerCommand(openLinkCommandName, function(link) {
		opn(link);
	}));
	diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
	context.subscriptions.push(diagnosticCollection);
}

exports.activate = activate;
