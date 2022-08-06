"use strict";

const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const nodeModulePrefixRe = /^node:/u;
const baseConfig = 	{
	"target": "node",
	"entry": "./extension.js",
	"module": {
		"rules": [
			{
				"test": /markdownlint-cli2.js$/
			}
		]
	},
	"output": {
		"path": __dirname,
		"filename": "bundle.js",
		"libraryTarget": "commonjs2"
	},
	"optimization": {
		// "minimize": false,
		// "moduleIds": "named",
		"minimizer": [ new TerserPlugin({"extractComments": false}) ]
	},
	"externals": {
		"vscode": "commonjs vscode"
	},
	"plugins": [
		new webpack.IgnorePlugin({"resourceRegExp": /katex/}),
		new webpack.NormalModuleReplacementPlugin(
			nodeModulePrefixRe,
			(resource) => {
				const module = resource.request.replace(nodeModulePrefixRe, "");
				resource.request = module;
			}
		)
	]
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
