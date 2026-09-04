// @ts-check

// eslint-disable-next-line unicorn/import-style
import { posix, win32 } from "node:path";
import { describe, test } from "node:test";
import { FsNull, FsWrapper, FileTypeDirectory, FileTypeFile, FileTypeSymbolicLink } from "../fs-wrappers.mjs";

/* eslint-disable class-methods-use-this, node-test/no-done-callback */

class UriStub {
	static file (/** @type {string} */ fsPath) {
		return new UriStub(fsPath);
	}

	constructor (/** @type {string} */ fsPath) {
		this.usFsPath = fsPath;
	}

	get authority () {
		return "";
	}

	get fragment () {
		return "";
	}

	get fsPath () {
		return this.usFsPath;
	}

	get path () {
		return "";
	}

	get query () {
		return "";
	}

	get scheme () {
		return "";
	}

	toJSON () {
		return "";
	}

	with (/** @type {import("../fs-wrappers.mjs").UriChangeLike} */ change) {
		return UriStub.file(change.path);
	}
}

const fileContent = "Hello world.";
/** @type {[ string, number ][]} */
const directoryContent = [
	[ "file.txt", FileTypeFile + FileTypeSymbolicLink ],
	[ "dir", FileTypeDirectory ]
];

class FileSystemStub {
	stat (/** @type {import("../fs-wrappers.mjs").UriLike} */ uri) {
		const uriPathParts = uri.fsPath.split(/[\\/]/u);
		// eslint-disable-next-line unicorn/prefer-at
		return Promise.resolve({ "ctime": 0, "mtime": 0, "size": 0, "type": Number(uriPathParts[uriPathParts.length - 1]) });
	}

	readDirectory () {
		return Promise.resolve(directoryContent);
	}

	readFile () {
		return Promise.resolve(new TextEncoder().encode(fileContent));
	}
}

const folderPath = "/Users/user/Project";
const folderUri = UriStub.file(folderPath);
const filePath = `${folderPath}/file.txt`;
const fs = new FileSystemStub();
function getTestFsWrapper () {
	return new FsWrapper(fs, folderUri, UriStub.file, posix.relative, posix.resolve);
}

describe("FsWrapper", () => {

	test("new FsWrapper", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(getTestFsWrapper);
	});

	test("new FsNull", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(() => new FsNull());
	});

	test("FsWrapper.access", (t, done) => {
		t.plan(1);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.access(filePath, 0, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.access/options=undefined", (t, done) => {
		t.plan(1);
		const fsWrapper = getTestFsWrapper();
		// @ts-ignore
		fsWrapper.access(filePath, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.stat/file+link", (t, done) => {
		t.plan(4);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.stat((FileTypeFile + FileTypeSymbolicLink).toString(), 0, (err, stat) => {
			t.assert.equal(err, null);
			t.assert.equal(stat.isFile(), true);
			t.assert.equal(stat.isDirectory(), false);
			t.assert.equal(stat.isSymbolicLink(), true);
			done();
		});
	});

	test("FsWrapper.stat/file+link/options=undefined", (t, done) => {
		t.plan(4);
		const fsWrapper = getTestFsWrapper();
		// @ts-ignore
		fsWrapper.stat((FileTypeFile + FileTypeSymbolicLink).toString(), (err, stat) => {
			t.assert.equal(err, null);
			t.assert.equal(stat.isFile(), true);
			t.assert.equal(stat.isDirectory(), false);
			t.assert.equal(stat.isSymbolicLink(), true);
			done();
		});
	});

	test("FsWrapper.stat/directory", (t, done) => {
		t.plan(4);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.stat(FileTypeDirectory.toString(), 0, (err, stat) => {
			t.assert.equal(err, null);
			t.assert.equal(stat.isFile(), false);
			t.assert.equal(stat.isDirectory(), true);
			t.assert.equal(stat.isSymbolicLink(), false);
			done();
		});
	});

	test("FsWrapper.readFile", (t, done) => {
		t.plan(2);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.readFile(filePath, 0, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readFile/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = getTestFsWrapper();
		// @ts-ignore
		fsWrapper.readFile(filePath, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=false", (t, done) => {
		t.plan(2);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.readdir(folderPath, { "withFileTypes": false }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files, directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=true", (t, done) => {
		t.plan(2);
		const fsWrapper = getTestFsWrapper();
		fsWrapper.readdir(folderPath, { "withFileTypes": true }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files?.map(({ name }) => name), directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = getTestFsWrapper();
		// @ts-ignore
		fsWrapper.readdir(folderPath, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files, directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsNull.access", (t, done) => {
		t.plan(1);
		const fsNull = new FsNull();
		// @ts-ignore
		fsNull.access(filePath, 0, (err) => {
			t.assert.equal(err.message, "FsNull.fnError");
			done();
		});
	});

	/* eslint-disable unicorn/prefer-string-raw */

	// [ uriStubJoinPath, fwFolderUriFilePath, pathSegment, expected ]
	/** @type {[ { "relative": import("../fs-wrappers.mjs").PathRelativeLike, "resolve": import("../fs-wrappers.mjs").PathResolveLike }, string, string, string ][]} */
	const fwFolderUriWithPathSegmentScenarios = [
		[ posix, "/Users/user/Project", "/Users/user/Project/.markdownlint.json", "/Users/user/Project/.markdownlint.json" ],
		[ posix, "/Users/user/Project", "/Users/user/Project/dir/.markdownlint.json", "/Users/user/Project/dir/.markdownlint.json" ],
		[ posix, "/Users/user/Project", "/Users/user/Alternate/.markdownlint.json", "/Users/user/Alternate/.markdownlint.json" ],
		[ win32, "c:\\Users\\user\\Project", "c:/Users/user/Project/.markdownlint.json", "c:\\Users\\user\\Project\\.markdownlint.json" ],
		[ win32, "c:\\Users\\user\\Project", "c:/Users/user/Project/test/.markdownlint.json", "c:\\Users\\user\\Project\\test\\.markdownlint.json" ],
		[ win32, "f:\\", ".markdownlint.json", "f:\\.markdownlint.json" ],
		[ win32, "f:\\Project", "f:/Project/.markdownlint.json", "f:\\Project\\.markdownlint.json" ],
		[ win32, "\\\\hostname\\c$\\Users\\user\\Project", "C:/Alternate/.markdownlint.json", "C:\\Alternate\\.markdownlint.json" ],
		[ win32, "\\\\hostname\\c$\\Users\\user", "//hostname/c$/Users/user/.markdownlint.json", "\\\\hostname\\c$\\Users\\user\\.markdownlint.json" ],
		// // Test scenarios related to missing leading "/" of UNC pathSegment (see comment in fwResolvePathSegment)
		[ win32, "\\\\hostname\\c$\\Users\\user", "/hostname/c$/Users/user/.markdownlint.json", "\\\\hostname\\c$\\Users\\user\\.markdownlint.json" ],
		[ win32, "\\\\hostname\\c$\\Users\\user", ".markdownlint.json", "\\\\hostname\\c$\\Users\\user\\.markdownlint.json" ],
		[ win32, "\\\\hostname\\c$\\Users\\user", "c:/Project/.markdownlint.json", "c:\\Project\\.markdownlint.json" ]
	];
	test("FsWrapper.fwResolvePathSegment", (t) => {
		t.plan(fwFolderUriWithPathSegmentScenarios.length);
		for (const [ pathImplementation, fwFolderUriFilePath, pathSegment, expected ] of fwFolderUriWithPathSegmentScenarios) {
			const fwFolderUri = UriStub.file(fwFolderUriFilePath);
			const fsWrapper = new FsWrapper(fs, fwFolderUri, UriStub.file, pathImplementation.relative, pathImplementation.resolve);
			const actual = fsWrapper.fwResolvePathSegment(pathSegment).fsPath;
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.equal(actual, expected);
		}
	});

});
