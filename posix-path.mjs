// @ts-check

import path from "node:path";

// Converts to a POSIX-style path
export default function posixPath (/** @type {string} */ anyPath) {
	return anyPath.split(path.sep).join(path.posix.sep);
}
