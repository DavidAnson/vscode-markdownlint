"use strict";

var fs = require("fs");
var packageJsonPath = "./package.json";
var packageJson = require(packageJsonPath);
var configurationSchema = require("./node_modules/markdownlint/schema/markdownlint-config-schema.json");
var defaultConfig = require("./default-config.json");

// Update package.json
var configurationRoot = packageJson.contributes.configuration.properties["markdownlint.config"];
configurationRoot.default = defaultConfig;
configurationRoot.properties = configurationSchema.properties;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "\t"));
