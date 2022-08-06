"use strict";

const fs = require("node:fs");

// Read schema
const configurationPath = "./markdownlint-config-schema.json";
const configurationSchema = require(configurationPath);

// Update schema
// eslint-disable-next-line guard-for-in
for (const property in configurationSchema.properties) {
	const reference = configurationSchema.properties[property].$ref;
	if (reference) {
		delete configurationSchema.properties[property].$ref;
		const rule = reference.split("/")[2];
		configurationSchema.properties[property] = configurationSchema.properties[rule];
	}
}

// Save schema
fs.writeFileSync(
	configurationPath,
	JSON.stringify(configurationSchema, null, "  ")
);
