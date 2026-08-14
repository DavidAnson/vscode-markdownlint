// @ts-check

import path from "node:path";

/** @typedef {{ "homedir": () => string, "type": () => string }} OsLike */
/** @typedef {{ "name": string, "uri": UriLike }} WorkspaceFolderLike */
/** @typedef {{ "scheme": string, "authority": string, "path": string, "query": string, "fragment": string, "fsPath": string, "with": (change: any) => any, "toJSON": () => any }} UriLike */
/** @typedef {{ "workspace": WorkspaceLike }} VscodeLike */
/** @typedef {{ "getWorkspaceFolder": (uri: UriLike) => WorkspaceFolderLike | undefined, "workspaceFolders": readonly WorkspaceFolderLike[] | undefined }} WorkspaceLike */
/** @typedef {{ [key: string]: string | undefined }} NodeProcessEnv */
/** @typedef {{ "env": NodeProcessEnv }} ProcessLike */

// https://code.visualstudio.com/docs/configure/settings#_user-settingsjson-location
/** @type {{[ type: string ]: [ string, string, (...paths: string[]) => string ]}} */
const userSettingsFileLocationByOsType = {
	"Darwin": [ "HOME", "Library/Application Support/Code/User/settings.json", path.posix.join ],
	"Linux": [ "HOME", ".config/Code/User/settings.json", path.posix.join ],
	"Windows_NT": [ "APPDATA", String.raw`Code\User\settings.json`, path.win32.join ]
};

/**
 * Converts an OS-formatted path into a POSIX-formatted path.
 * @param {string} input OS-formatted path.
 * @returns {string} POSIX-formatted path.
 */
function toPosixPath (input) {
	return input.split(path.sep).join(path.posix.sep);
}

/**
 * Replaces supported VS Code variables in a string.
 * @see {@link https://code.visualstudio.com/docs/reference/variables-reference}
 * @param {string | null | undefined} input Input string.
 * @param {UriLike} uri Document URI.
 * @param {VscodeLike} vscode VS Code module.
 * @param {OsLike} os Node OS module.
 * @param {ProcessLike} proc Node Process module.
 * @returns {string} String with replacements.
 */
function replaceVariables (input, uri, vscode, os, proc) {
	// eslint-disable-next-line complexity, func-style
	const replacer = (/** @type {string} */ match) => {
		// eslint-disable-next-line no-template-curly-in-string
		if (match === "${userHome}") {
			const homedir = os && os.homedir && os.homedir();
			if (homedir) {
				return homedir;
			}
		}
		const workspaceFolderNameMatch = /^\$\{workspaceFolder:(?<name>.+)\}$/u.exec(match);
		const workspaceFolderName = workspaceFolderNameMatch?.groups?.name;
		if (workspaceFolderNameMatch && workspaceFolderName && vscode.workspace.workspaceFolders) {
			for (const workspaceFolder of vscode.workspace.workspaceFolders) {
				if (workspaceFolder.name === workspaceFolderName) {
					return toPosixPath(workspaceFolder.uri.fsPath);
				}
			}
			// Fall through to unnamed behavior if no match found
		}
		// eslint-disable-next-line no-template-curly-in-string
		if (workspaceFolderNameMatch || (match === "${workspaceFolder}")) {
			const workspaceFolder = vscode && vscode.workspace && vscode.workspace.getWorkspaceFolder && vscode.workspace.getWorkspaceFolder(uri);
			const fsPath = workspaceFolder ? workspaceFolder.uri.fsPath : path.join(uri.fsPath, "..");
			return toPosixPath(fsPath);
		}
		// eslint-disable-next-line no-template-curly-in-string
		if (match === "${userSettingsFile}") {
			const type = os && os.type && os.type();
			if (type) {
				const userSettingsFileLocation = userSettingsFileLocationByOsType[type];
				if (userSettingsFileLocation) {
					const [ key, suffix, join ] = userSettingsFileLocation;
					const prefix = proc.env[key];
					if (prefix) {
						return join(prefix, suffix);
					}
				}
			}
		}
		// Return input as-is if unsupported
		return match;
	};
	// eslint-disable-next-line unicorn/no-unsafe-string-replacement
	return (input || "").replace(/\$\{[^}]+\}/gu, replacer);
}

export default replaceVariables;
