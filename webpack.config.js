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
	"plugins": [ new webpack.IgnorePlugin({"resourceRegExp": /katex/}) ]
};
const config = [
	{
		...baseConfig,
		"plugins": [
			...baseConfig.plugins,
			new webpack.NormalModuleReplacementPlugin(
				nodeModulePrefixRe,
				(resource) => {
					const module = resource.request.replace(nodeModulePrefixRe, "");
					resource.request = module;
				}
			)
		]
	},
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
			new webpack.NormalModuleReplacementPlugin(
				nodeModulePrefixRe,
				(resource) => {
					let module = resource.request.replace(nodeModulePrefixRe, "");
					if (module === "url") {
						module = "url-stub";
					}
					resource.request = module;
				}
			),
			new webpack.ProvidePlugin({
				"process": "process-wrapper"
			})
		],
		"resolve": {
			"fallback": {
				"fs": false,
				"os": require.resolve("./webworker/os-stub.js"),
				"path": require.resolve("path-browserify"),
				"process": require.resolve("./webworker/process-wrapper.js"),
				"process-wrapper": require.resolve("./webworker/process-wrapper.js"),
				"stream": require.resolve("stream-browserify"),
				"url-stub": require.resolve("./webworker/url-stub.js"),
				"util": require.resolve("util")
			}
		}
	}
];
module.exports = config;
