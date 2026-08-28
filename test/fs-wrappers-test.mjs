// @ts-check

// eslint-disable-next-line unicorn/import-style
import { posix, win32 } from "node:path";
import { describe, test } from "node:test";
import { FsNull, FsWrapper, FileTypeDirectory, FileTypeFile, FileTypeSymbolicLink } from "../fs-wrappers.mjs";

/* eslint-disable class-methods-use-this, node-test/no-done-callback */

class UriStub {
	static file (/** @type {string} */ path) {
		return new UriStub(path);
	}

	constructor (/** @type {string} */ path) {
		this.usPath = path;
	}

	get authority () {
		return "";
	}

	get fragment () {
		return "";
	}

	get fsPath () {
		return this.usPath;
	}

	get path () {
		return this.usPath;
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
		const uriPathParts = uri.path.split(/[\\/]/u);
		return Promise.resolve({ "ctime": 0, "mtime": 0, "size": 0, "type": Number(uriPathParts.at(-1)) });
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

describe("FsWrapper", () => {

	test("new FsWrapper", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(() => new FsWrapper(fs, folderUri, UriStub.file, posix.resolve));
	});

	test("new FsNull", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(() => new FsNull());
	});

	test("FsWrapper.access", (t, done) => {
		t.plan(1);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		fsWrapper.access(filePath, 0, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.access/options=undefined", (t, done) => {
		t.plan(1);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		// @ts-ignore
		fsWrapper.access(filePath, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.stat/file+link", (t, done) => {
		t.plan(4);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
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
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
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
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
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
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		fsWrapper.readFile(filePath, 0, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readFile/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		// @ts-ignore
		fsWrapper.readFile(filePath, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=false", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		fsWrapper.readdir(folderPath, { "withFileTypes": false }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files, directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=true", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
		fsWrapper.readdir(folderPath, { "withFileTypes": true }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files?.map(({ name }) => name), directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri, UriStub.file, posix.resolve);
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
	/** @type {[ import("../fs-wrappers.mjs").PathResolveLike, string, string, string ][]} */
	const fwFolderUriWithPathSegmentScenarios = [
		[ posix.resolve, "/Users/user/Project", "/Users/user/Project/.markdownlint.json", "/Users/user/Project/.markdownlint.json" ],
		[ posix.resolve, "/Users/user/Project", "/Users/user/Project/dir/.markdownlint.json", "/Users/user/Project/dir/.markdownlint.json" ],
		[ posix.resolve, "/Users/user/Project", "/Users/user/Alternate/.markdownlint.json", "/Users/user/Alternate/.markdownlint.json" ],
		[ win32.resolve, "c:\\Users\\user\\Project", "c:/Users/user/Project/.markdownlint.json", "c:\\Users\\user\\Project\\.markdownlint.json" ],
		[ win32.resolve, "c:\\Users\\user\\Project", "c:/Users/user/Project/test/.markdownlint.json", "c:\\Users\\user\\Project\\test\\.markdownlint.json" ],
		[ win32.resolve, "f:\\", ".markdownlint.json", "f:\\.markdownlint.json" ],
		[ win32.resolve, "f:\\Project", "f:/Project/.markdownlint.json", "f:\\Project\\.markdownlint.json" ],
		[ win32.resolve, "\\\\hostname\\c$\\Users\\user", "//hostname/c$/Users/user/.markdownlint.json", "\\\\hostname\\c$\\Users\\user\\.markdownlint.json" ],
		[ win32.resolve, "\\\\hostname\\c$\\Users\\user\\Project", "C:/Folder/.markdownlint.json", "C:\\Folder\\.markdownlint.json" ]
	];
	test("fwFolderUriWithPathSegment/workspace/macOS", (t) => {
		t.plan(fwFolderUriWithPathSegmentScenarios.length);
		for (const [ pathResolve, fwFolderUriFilePath, pathSegment, expected ] of fwFolderUriWithPathSegmentScenarios) {
			const fwFolderUri = UriStub.file(fwFolderUriFilePath);
			const fsWrapper = new FsWrapper(fs, fwFolderUri, UriStub.file, pathResolve);
			const actual = fsWrapper.fwFolderUriWithPathSegment(pathSegment);
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.equal(actual.fsPath, expected);
		}
	});

});
