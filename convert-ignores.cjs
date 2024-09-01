// @ts-check

"use strict";

const picomatch = require("picomatch/posix");

/**
 * Converts an array of ignore strings to ignore functions.
 * @param {String[]} ignores Array of ignore strings.
 * @returns {Function[]} Array of ignore functions.
 */
function convertIgnores (ignores) {
	return ignores.map(
		(ignore) => picomatch(ignore, { "dot": true })
	);
}

module.exports = convertIgnores;
