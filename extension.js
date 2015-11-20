var vscode = require("vscode");
var markdownlint = require("markdownlint");
var packageJson = require("./package.json");

var newLineRe = /\r\n|\r|\n/;
var resultLineRe = /^document: (\d+): (MD\d\d\d) (.*)$/;

function lint(document) {
	var options = {
		"strings": {
			"document": document.getText()
		},
		"config": {
			"MD013": false
		}
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
				diagnostics.push(diagnostic);
			}
		});

	var diagnosticCollection = vscode.languages.createDiagnosticCollection(packageJson.name);
	diagnosticCollection.set(document.uri, diagnostics);
}

function activate(context) {
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(function didOpenTextDocument(document) {
		lint(document);
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function didChangeTextDocument(change) {
		lint(change.document);
	}));
}

exports.activate = activate;
