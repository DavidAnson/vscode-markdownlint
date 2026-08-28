// @ts-check

import { promisify } from "node:util";

/** @type {import("vscode").FileType.Unknown} */
export const FileTypeUnknown = 0;
/** @type {import("vscode").FileType.File} */
export const FileTypeFile = 1;
/** @type {import("vscode").FileType.Directory} */
export const FileTypeDirectory = 2;
/** @type {import("vscode").FileType.SymbolicLink} */
export const FileTypeSymbolicLink = 64;

/**
 * @typedef UriChangeLike
 * @property {string} path
 */

/**
 * @typedef UriLike
 * @property {string} authority
 * @property {string} fragment
 * @property {string} fsPath
 * @property {string} path
 * @property {string} query
 * @property {string} scheme
 * @property {() => any} toJSON
 * @property {(change: UriChangeLike) => UriLike} with
 */

/** @typedef {(path: string) => UriLike} UriFileLike */
/** @typedef {(...paths: string[]) => string} PathResolveLike */

/**
 * @typedef FileSystemLike
 * @property {(uri: UriLike) => Thenable<[string, FileTypeUnknown|FileTypeFile|FileTypeDirectory|FileTypeSymbolicLink][]>} readDirectory
 * @property {(uri: UriLike) => Thenable<Uint8Array>} readFile
 * @property {(uri: UriLike) => Thenable<import("vscode").FileStat>} stat
 */

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
		return this.fwUriFile(this.fwResolve(this.fwFolderUri.fsPath, pathSegment));
	}

	// Implements fs.access via vscode.workspace.fs
	fwAccess (/** @type {string} */ pathSegment, /** @type {number} */ mode, /** @type {(err: Error|null) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= mode;
		this.fwFs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			() => callback(null),
			callback
		);
	}

	// Implements fs.readdir via vscode.workspace.fs
	fwReaddir (/** @type {string} */ pathSegment, /** @type { { withFileTypes: Boolean} } */ options, /** @type {(err: Error|null, data?: any[]) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		this.fwFs.readDirectory(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
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
								"isDirectory": (fileType & FileTypeDirectory) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isFIFO": FsWrapper.fwFalse,
								"isFile": (fileType & FileTypeFile) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
								"isSocket": FsWrapper.fwFalse,
								"isSymbolicLink":
									(fileType & FileTypeSymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse,
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
	fwReadFile (/** @type {string} */ pathSegment, /** @type {{}} */ options, /** @type {(err: Error|null, data?: string) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		this.fwFs.readFile(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(bytes) => callback(null, new TextDecoder().decode(bytes)),
			callback
		);
	}

	// Implements fs.stat via vscode.workspace.fs
	fwStat (/** @type {string} */ pathSegment, /** @type {{}} */ options, /** @type {(err: Error|null, stat?: any) => void} */ callback) {
		// @ts-ignore
		// eslint-disable-next-line no-param-reassign
		callback ||= options;
		this.fwFs.stat(
			this.fwFolderUriWithPathSegment(pathSegment)
		).then(
			(/** @type {any} */ fileStat) => {
				// Stub required properties for fast-glob
				/* eslint-disable dot-notation, no-bitwise */
				fileStat["isBlockDevice"] = FsWrapper.fwFalse;
				fileStat["isCharacterDevice"] = FsWrapper.fwFalse;
				fileStat["isDirectory"] = (fileStat.type & FileTypeDirectory) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isFIFO"] = FsWrapper.fwFalse;
				fileStat["isFile"] = (fileStat.type & FileTypeFile) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				fileStat["isSocket"] = FsWrapper.fwFalse;
				fileStat["isSymbolicLink"] =
					(fileStat.type & FileTypeSymbolicLink) ? FsWrapper.fwTrue : FsWrapper.fwFalse;
				/* eslint-enable dot-notation, no-bitwise */
				callback(null, fileStat);
			},
			callback
		);
	}

	// Constructs a new instance
	constructor (/** @type {FileSystemLike} */ fs, /** @type {UriLike} */ folderUri, /** @type {UriFileLike} */ uriFile, /** @type {PathResolveLike} */ pathResolve) {
		this.fwFs = fs;
		this.fwFolderUri = folderUri;
		this.fwUriFile = uriFile;
		this.fwResolve = pathResolve;
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
	static fnError (/** @type {UriLike} */ pathSegment, /** @type {{}} */ modeOrOptions, /** @type {(err: Error) => void} */ callback) {
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
