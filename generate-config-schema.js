"use strict";

const fs = require("node:fs");
const packageJsonPath = "./package.json";
const packageJson = require(packageJsonPath);
const configurationSchema = require("./markdownlint-config-schema.json");

// Update package.json
const configurationRoot = packageJson.contributes.configuration.properties["markdownlint.config"];
configurationRoot.properties = configurationSchema.properties;
configurationRoot.additionalProperties = configurationSchema.additionalProperties;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "\t") + "\n");
