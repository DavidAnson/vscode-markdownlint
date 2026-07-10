// @ts-check

/* eslint-disable n/no-unpublished-import */

import js from "@eslint/js";
import eslintNodeTest from "eslint-node-test";
import eslintPluginN from "eslint-plugin-n";
import eslintPluginStylistic from "@stylistic/eslint-plugin";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

export default [
	js.configs.all,
	eslintNodeTest.configs.all,
	eslintPluginN.configs["flat/recommended"],
	eslintPluginStylistic.configs.customize({
		"arrowParens": true,
		"braceStyle": "1tbs",
		"commaDangle": "never",
		"indent": "tab",
		"jsx": false,
		"quoteProps": "always",
		"quotes": "double",
		"semi": true
	}),
	eslintPluginUnicorn.configs.all,
	{
		"languageOptions": {
			"sourceType": "commonjs"
		},
		"linterOptions": {
			"reportUnusedDisableDirectives": true
		},
		"rules": {
			"array-bracket-spacing": [ "error", "always" ],
			"dot-location": [ "error", "property" ],
			"func-style": [ "error", "declaration" ],
			"function-call-argument-newline": [ "error", "consistent" ],
			"function-paren-newline": [ "error", "consistent" ],
			"global-require": "off",
			"indent": [ "error", "tab" ],
			"linebreak-style": "off",
			"max-classes-per-file": "off",
			"max-depth": [ "error", 6 ],
			"max-lines": "off",
			"max-lines-per-function": "off",
			"max-params": "off",
			"max-statements": "off",
			"multiline-comment-style": [ "error", "separate-lines" ],
			"no-extra-parens": "off",
			"no-inline-comments": "off",
			"no-magic-numbers": "off",
			"no-plusplus": "off",
			"no-promise-executor-return": "off",
			"no-sync": "off",
			"no-tabs": "off",
			"no-ternary": "off",
			"no-undefined": "off",
			"no-use-before-define": [ "error", { "functions": false } ],
			"one-var": "off",
			"operator-linebreak": [ "error", "after" ],
			"padded-blocks": "off",
			"prefer-destructuring": "off",
			"prefer-named-capture-group": "off",
			"prefer-template": "off",
			"require-unicode-regexp": "off",
			"sort-imports": "off",
			"sort-keys": "off",

			"n/no-missing-require": [ "error", { "allowModules": [ "vscode" ] } ],

			"@stylistic/array-bracket-spacing": [ "error", "always" ],
			"@stylistic/indent": [ "error", "tab", { "ObjectExpression": "first" } ],
			"@stylistic/operator-linebreak": [ "error", "after" ],
			"@stylistic/space-before-function-paren": [ "error", "always" ],

			"node-test/consistent-test-filename": "off",
			"node-test/consistent-test-it": [ "error", { "fn": "test", "withinDescribe": "test" } ],
			"node-test/prefer-lowercase-title": "off",
			"node-test/prefer-strict-assert": "off",

			"unicorn/comment-content": "off",
			"unicorn/consistent-boolean-name": "off",
			"unicorn/consistent-class-member-order": "off",
			"unicorn/default-export-style": "off",
			"unicorn/max-nested-calls": "off",
			"unicorn/name-replacements": "off",
			"unicorn/no-array-push-push": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/no-asterisk-prefix-in-documentation-comments": "off",
			"unicorn/no-null": "off",
			"unicorn/no-unreadable-for-of-expression": "off",
			"unicorn/no-unreadable-new-expression": "off",
			"unicorn/no-useless-undefined": "off",
			"unicorn/prefer-await": "off",
			"unicorn/prefer-early-return": "off",
			"unicorn/prefer-module": "off",
			"unicorn/prefer-string-replace-all": "off",
			"unicorn/prefer-temporal": "off"
		}
	},
	{
		"files": [
			"**/*.mjs"
		],
		"languageOptions": {
			"sourceType": "module"
		}
	},
	{
		"files": [
			"test/*.mjs"
		],
		"rules": {
			"id-length": "off",

			"n/no-unsupported-features/es-syntax": [ "error", { "ignores": [ "error-cause" ] } ],
			"n/no-unsupported-features/node-builtins": [ "error", { "ignores": [ "test", "test.describe", "test.test" ] } ],

			"@stylistic/padded-blocks": "off"
		}
	}
];
