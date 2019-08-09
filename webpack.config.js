"use strict";

const config = {
	"target": "node",
	"entry": "./extension.js",
	"output": {
		"path": __dirname,
		"filename": "bundle.js",
		"libraryTarget": "commonjs2"
	},
	"externals": {
		"vscode": "commonjs vscode"
	}
};
module.exports = config;
