"use strict";

const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const config = {
	"target": "node",
	"entry": "./extension.js",
	"module": {
		"rules": [
			{
				"test": /markdownlint-cli2.js$/,
				"loader": "shebang-loader"
			}
		]
	},
	"output": {
		"path": __dirname,
		"filename": "bundle.js",
		"libraryTarget": "commonjs2"
	},
	"optimization": {
		"minimizer": [ new TerserPlugin({"extractComments": false}) ]
	},
	"externals": {
		"vscode": "commonjs vscode"
	},
	"plugins": [ new webpack.IgnorePlugin({"resourceRegExp": /katex/}) ]
};
module.exports = config;
