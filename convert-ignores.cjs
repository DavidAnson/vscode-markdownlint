// @ts-check

"use strict";

const { minimatch } = require("minimatch");

/**
 * Converts an array of ignore strings to ignore functions.
 * @param {String[]} ignores Array of ignore strings.
 * @returns {Function[]} Array of ignore functions.
 */
function convertIgnores (ignores) {
	const result = [];
	for (const ignore of ignores) {
		const ignoreRe = minimatch.makeRe(ignore, {
			"dot": true,
			"nocomment": true
		});
		if (ignoreRe) {
			result.push((file) => ignoreRe.test(file));
		}
	}
	return result;
}

module.exports = convertIgnores;
