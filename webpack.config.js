"use strict";

const webpack = require("webpack");

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
	},
	"plugins": [ new webpack.IgnorePlugin(/katex/) ]
};
module.exports = config;
