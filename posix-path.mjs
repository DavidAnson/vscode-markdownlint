// @ts-check

// Converts to a POSIX-style path
export default function posixPath (/** @type {string} */ anyPath) {
	return anyPath.replaceAll("\\", "/");
}
