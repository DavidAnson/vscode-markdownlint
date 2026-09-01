// @ts-check

import path from "node:path";

// Converts to a POSIX-style path
export default function posixPath (/** @type {string} */ anyPath, /** @type {string} */ sep = path.sep) {
	return anyPath.split(sep).join(path.posix.sep);
}
