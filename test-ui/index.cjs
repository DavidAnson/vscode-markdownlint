// @ts-check

"use strict";

// This must be CommonJS or the VS Code host fails with:
// Error [ERR_REQUIRE_ESM]: require() of ES Module .../index.mjs not supported.

const { tests } = require("./tests.cjs");

function run () {
	return tests.reduce((previous, current) => previous.then(() => {
		// eslint-disable-next-line no-console
		console.log(`- ${current.name}...`);
		return current();
	}), Promise.resolve());
}

module.exports = { run };
