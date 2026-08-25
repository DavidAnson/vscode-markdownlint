// @ts-check

// eslint-disable-next-line n/no-missing-import
import vscode from "vscode";
import path from "node:path";
import { promisify } from "node:util";

const driveLetterRe = /^[A-Za-z]:[/\\]/;
const networkShareRe = /^\\\\[^\\]+\\/;
const firstSegmentRe = /^\/{1,2}[^/]+\//;

// Converts to a POSIX-style path
// eslint-disable-next-line id-length
function posixPath (/** @type {string} */ p) {
	return p.split(path.sep).join(path.posix.sep);
}

// A Node-like fs object implemented using vscode.workspace.fs
export class FsWrapper {
	// Returns true
	static fwTrue () {
		return true;
	}

	// Returns false
	static fwFalse () {
		return false;
	}

	// Returns a Uri of fwFolderUri with the specified path segment
	fwFolderUriWithPathSegment (/** @type {string} */ pathSegment) {
		// Fix drive letter issues on Windows
		let posixPathSegment = posixPath(pathSegment);
		if (driveLetterRe.test(posixPathSegment)) {
			// eslint-disable-next-line unicorn/prefer-ternary
			if (
				this.fwFolderUri.path.startsWith("/") &&
				driveLetterRe.test(this.fwFolderUri.path.slice(1))
			) {
				// Both paths begin with Windows drive letter, make it consistent
				posixPathSegment = `/${posixPathSegment}`;
			} else {
				// Folder path does not start with Windows drive letter, remove it
				posixPathSegment = posixPathSegment.replace(driveLetterRe, "/");
			}
		}
		// Fix network share issues on Windows (possibly in addition to drive letter issues)
		if (networkShareRe.test(this.fwFolderUri.fsPath)) {
			// Path segment has the computer name prefixed, remove it
			posixPathSegment = posixPathSegment.replace(firstSegmentRe, "/");
		}
		// Return consistently-formatted Uri with specified path
		return this.fwFolderUri.with({ "path": posixPathSegment });
	}

	// Implements fs.access via vscode.workspace.fs
	fwAccess (/** @type {string} */ pathSegment, /** @type {number} */ mode, /** @type {(stat: import("vscode").FileStat | null) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= mode;
		vscode.workspace.fs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			() => callback(null),
			callback
		);
	}

	// Implements fs.readdir via vscode.workspace.fs
	fwReaddir (/** @type {string} */ pathSegment, /** @type { { withFileTypes: Boolean} } */ options, /** @type {(err: null, data: any[]) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.readDirectory(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			// @ts-ignore
			(namesAndTypes) => {
				const namesOrDirents = namesAndTypes.map(
					(nameAndType) => {
						const [
							name,
							fileType
						] = nameAndType;
						return options.withFileTypes ?
							{
								/* eslint-disable no-bitwise */
								"isBlockDevice": FsWrapper.fwFalse,
								"isCharacterDevice": FsWrapper.fwFalse,
								"isDirectory": (fileType & vscode.FileType.Directory) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isFIFO": FsWrapper.fwFalse,
								"isFile": (fileType & vscode.FileType.File) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isSocket": FsWrapper.fwFalse,
								"isSymbolicLink":
									(fileType & vscode.FileType.SymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								/* eslint-enable no-bitwise */
								name
							} :
							name;
					}
				);
				callback(null, namesOrDirents);
			},
			callback
		);
	}

	// Implements fs.readFile via vscode.workspace.fs
	fwReadFile (/** @type {string} */ pathSegment, /** @type {{}} */ options, /** @type {(err: null, data: string) => Uint8Array<ArrayBufferLike>} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.readFile(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(bytes) => callback(null, new TextDecoder().decode(bytes)),
			// @ts-ignore
			callback
		);
	}

	// Implements fs.stat via vscode.workspace.fs
	fwStat (/** @type {string} */ pathSegment, /** @type {{}} */ options, /** @type {(err: null, stat: any) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		vscode.workspace.fs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(/** @type {any} */ fileStat) => {
				// Stub required properties for fast-glob
				/* eslint-disable dot-notation, no-bitwise */
				fileStat["isBlockDevice"] = FsWrapper.fwFalse;
				fileStat["isCharacterDevice"] = FsWrapper.fwFalse;
				fileStat["isDirectory"] = (fileStat.type & vscode.FileType.Directory) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isFIFO"] = FsWrapper.fwFalse;
				fileStat["isFile"] = (fileStat.type & vscode.FileType.File) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isSocket"] = FsWrapper.fwFalse;
				fileStat["isSymbolicLink"] =
					(fileStat.type & vscode.FileType.SymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				/* eslint-enable dot-notation, no-bitwise */
				callback(null, fileStat);
			},
			// @ts-ignore
			callback
		);
	}

	// Constructs a new instance
	constructor (/** @type {import("vscode").Uri} */ folderUri) {
		this.fwFolderUri = folderUri;
		this.access = this.fwAccess.bind(this);
		this.readdir = this.fwReaddir.bind(this);
		this.readFile = this.fwReadFile.bind(this);
		this.stat = this.fwStat.bind(this);
		this.lstat = this.stat;
		this.promises = {
			"access": promisify(this.fwAccess).bind(this),
			"readFile": promisify(this.fwReadFile).bind(this),
			"stat": promisify(this.fwStat).bind(this)
		};
	}
}

// A Node-like fs object for a "null" file system
export class FsNull {
	// Implements fs.access/readdir/readFile/stat
	static fnError (/** @type {import("vscode").Uri} */ pathSegment, /** @type {{}} */ modeOrOptions, /** @type {(err: Error) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= modeOrOptions;
		callback(new Error("FsNull.fnError"));
	}

	// Constructs a new instance
	constructor () {
		const error = FsNull.fnError;
		const errorPromise = promisify(error);
		this.access = error;
		this.readdir = error;
		this.readFile = error;
		this.stat = error;
		this.lstat = error;
		this.promises = {
			"access": errorPromise,
			"readFile": errorPromise,
			"stat": errorPromise
		};
	}
}
