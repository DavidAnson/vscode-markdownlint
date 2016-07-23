"use strict";

var fs = require("fs");
var path = require("path");
var tv4 = require("tv4");
var packageJsonPath = "./package.json";
var packageJson = require(packageJsonPath);
var defaultConfig = require("./default-config.json");
var rules = require("./node_modules/markdownlint/lib/rules");

// Schema scaffolding
var schema = {
	"title": "Markdownlint configuration schema",
	"type": "object",
	"properties": {
		"default": {
			"description": "Default state for all rules",
			"type": "boolean",
			"default": true
		}
	},
	"additionalProperties": false
};
var tags = {};

// Add rules
rules.forEach(function forRule (rule) {
	rule.tags.forEach(function forTag (tag) {
		var tagRules = tags[tag] || [];
		tagRules.push(rule.name);
		tags[tag] = tagRules;
	});
	var scheme = {
		"description": rule.name + "/" + rule.aliases.join("/") + " - " + rule.desc,
		"type": "boolean",
		"default": true
	};
	var custom = true;
	switch (rule.name) {
	case "MD002":
	case "MD025":
	case "MD041":
		scheme.properties = {
			"level": {
				"description": "Header level",
				"type": "integer",
				"default": 1
			}
		};
		break;
	case "MD003":
		scheme.properties = {
			"style": {
				"description": "Header style",
				"type": "string",
				"enum": [ "consistent", "atx", "atx_closed", "setext", "setext_with_atx", "setext_with_atx_closed" ],
				"default": "consistent"
			}
		};
		break;
	case "MD004":
		scheme.properties = {
			"style": {
				"description": "List style",
				"type": "string",
				"enum": [ "consistent", "asterisk", "plus", "dash", "sublist" ],
				"default": "consistent"
			}
		};
		break;
	case "MD007":
		scheme.properties = {
			"indent": {
				"description": "Spaces for indent",
				"type": "integer",
				"default": 2
			}
		};
		break;
	case "MD009":
		scheme.properties = {
			"br_spaces": {
				"description": "Spaces for line break",
				"type": "integer",
				"default": 0
			}
		};
		break;
	case "MD013":
		scheme.properties = {
			"line_length": {
				"description": "Number of characters",
				"type": "integer",
				"default": 80
			},
			"code_blocks": {
				"description": "Exclude for code blocks",
				"type": "boolean",
				"default": true
			},
			"tables": {
				"description": "Exclude for tables",
				"type": "boolean",
				"default": true
			}
		};
		break;
	case "MD026":
		scheme.properties = {
			"punctuation": {
				"description": "Punctuation characters",
				"type": "string",
				"default": ".,;:!?"
			}
		};
		break;
	case "MD029":
		scheme.properties = {
			"style": {
				"description": "List style",
				"type": "string",
				"enum": [ "one", "ordered" ],
				"default": "one"
			}
		};
		break;
	case "MD030":
		scheme.properties = {
			"ul_single": {
				"description": "Spaces for single-line unordered list items",
				"type": "integer",
				"default": 1
			},
			"ol_single": {
				"description": "Spaces for single-line ordered list items",
				"type": "integer",
				"default": 1
			},
			"ul_multi": {
				"description": "Spaces for multi-line unordered list items",
				"type": "integer",
				"default": 1
			},
			"ol_multi": {
				"description": "Spaces for multi-line ordered list items",
				"type": "integer",
				"default": 1
			}
		};
		break;
	case "MD033":
		scheme.properties = {
			"allowed_elements": {
				"description": "Allowed elements",
				"type": "array",
				"items": {
					"type": "string"
				},
				"default": []
			}
		};
		break;
	case "MD035":
		scheme.properties = {
			"style": {
				"description": "Horizontal rule style",
				"type": "string",
				"default": "consistent"
			}
		};
		break;
	case "MD043":
		scheme.properties = {
			"headers": {
				"description": "List of headers",
				"type": "array",
				"items": {
					"type": "string"
				},
				"default": null
			}
		};
		break;
	default:
		custom = false;
		break;
	}
	if (custom) {
		scheme.type = [ "boolean", "object" ];
		scheme.additionalProperties = false;
	}
	schema.properties[rule.name] = scheme;
	rule.aliases.forEach(function forAlias (alias) {
		schema.properties[alias] = scheme;
	});
});

// Add tags
Object.keys(tags).forEach(function forTag (tag) {
	var scheme = {
		"description": tag + " - " + tags[tag].join(", "),
		"type": "boolean",
		"default": true
	};
	schema.properties[tag] = scheme;
});

// Write schema
fs.writeFileSync("config-schema.json", JSON.stringify(schema, null, "\t"));

// Validate schema
var testDirectory = "./node_modules/markdownlint/test";
var testFiles = fs.readdirSync(testDirectory);
testFiles.forEach(function forFile (file) {
	if (file.endsWith(".json")) {
		var data = fs.readFileSync(path.join(testDirectory, file));
		if (!tv4.validate(JSON.parse(data), schema)) {
			throw new Error(file + "\n" + JSON.stringify(tv4.error, null, 2));
		}
	}
});

// Update package.json
var configurationRoot = packageJson.contributes.configuration.properties["markdownlint.config"];
configurationRoot.default = defaultConfig;
configurationRoot.properties = schema.properties;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "\t"));
