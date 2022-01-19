"use strict";

const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const baseConfig = 	{
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
		"node:fs": "commonjs fs",
		"node:path": "commonjs path",
		"node:process": "commonjs process",
		"node:stream": "commonjs stream",
		"node:url": "commonjs url",
		"node:util": "commonjs util",
		"vscode": "commonjs vscode"
	},
	"plugins": [ new webpack.IgnorePlugin({"resourceRegExp": /katex/}) ]
};
const config = [
	baseConfig,
	{
		...baseConfig,
		"target": "webworker",
		"output": {
			...baseConfig.output,
			"filename": "bundle.web.js",
			"libraryTarget": "commonjs"
		},
		"plugins": [
			...baseConfig.plugins,
			new webpack.IgnorePlugin({"resourceRegExp": /markdownlint-cli2/}),
			new webpack.IgnorePlugin({"resourceRegExp": /jsonc-parser/}),
			new webpack.IgnorePlugin({"resourceRegExp": /js-yaml/})
		],
		"resolve": {
			"fallback": {
				"fs": false,
				"os": false,
				"path": false,
				"util": false
			}
		}
	}
];
module.exports = config;
