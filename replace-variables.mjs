// @ts-check

import path from "node:path";

/** @typedef {{ "homedir": () => string }} OsLike */
/** @typedef {{ "uri": UriLike }} WorkspaceFolderLike */
/** @typedef {{ "scheme": string, "authority": string, "path": string, "query": string, "fragment": string, "fsPath": string, "with": (change: any) => any, "toJSON": () => any }} UriLike */
/** @typedef {{ "workspace": WorkspaceLike }} VscodeLike */
/** @typedef {{ "getWorkspaceFolder": (uri: UriLike) => WorkspaceFolderLike | undefined }} WorkspaceLike */

/**
 * Replaces supported VS Code variables in a string.
 * @see {@link https://code.visualstudio.com/docs/reference/variables-reference}
 * @param {string | null | undefined} input Input string.
 * @param {UriLike} uri Document URI.
 * @param {VscodeLike} vscode VS Code module.
 * @param {OsLike} os Node OS module.
 * @returns {string} String with replacements.
 */
function replaceVariables (input, uri, vscode, os) {
	// eslint-disable-next-line func-style
	const replacer = (/** @type {string} */ match) => {
		// eslint-disable-next-line no-template-curly-in-string
		if (match === "${userHome}") {
			const homedir = os && os.homedir && os.homedir();
			if (homedir) {
				return homedir;
			}
		// eslint-disable-next-line no-template-curly-in-string
		} else if (match === "${workspaceFolder}") {
			const workspaceFolder = vscode && vscode.workspace && vscode.workspace.getWorkspaceFolder && vscode.workspace.getWorkspaceFolder(uri);
			const fsPath = workspaceFolder ? workspaceFolder.uri.fsPath : path.join(uri.fsPath, "..");
			return fsPath.split(path.sep).join(path.posix.sep);
		}
		return match;
	};
	return (input || "").replace(/\${[A-Za-z]+}/g, replacer);
}

export default replaceVariables;
