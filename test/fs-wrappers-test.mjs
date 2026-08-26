// @ts-check

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
		return Promise.resolve({ "ctime": 0, "mtime": 0, "size": 0, "type": Number(uri.path) });
	}

	readDirectory () {
		return Promise.resolve(directoryContent);
	}

	readFile () {
		return Promise.resolve(new TextEncoder().encode(fileContent));
	}
}

const folderPath = "/Users/user/Folder";
const folderUri = UriStub.file(folderPath);
const filePath = `${folderPath}/file.txt`;
const fs = new FileSystemStub();

describe("FsWrapper", () => {

	test("new FsWrapper", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(() => new FsWrapper(fs, folderUri));
	});

	test("new FsNull", (t) => {
		t.plan(1);
		// eslint-disable-next-line node-test/no-useless-assertion
		t.assert.doesNotThrow(() => new FsNull());
	});

	test("FsWrapper.access", (t, done) => {
		t.plan(1);
		const fsWrapper = new FsWrapper(fs, folderUri);
		fsWrapper.access(filePath, 0, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.access/options=undefined", (t, done) => {
		t.plan(1);
		const fsWrapper = new FsWrapper(fs, folderUri);
		// @ts-ignore
		fsWrapper.access(filePath, (err) => {
			t.assert.equal(err, null);
			done();
		});
	});

	test("FsWrapper.stat/file+link", (t, done) => {
		t.plan(4);
		const fsWrapper = new FsWrapper(fs, folderUri);
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
		const fsWrapper = new FsWrapper(fs, folderUri);
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
		const fsWrapper = new FsWrapper(fs, folderUri);
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
		const fsWrapper = new FsWrapper(fs, folderUri);
		fsWrapper.readFile(filePath, 0, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readFile/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri);
		// @ts-ignore
		fsWrapper.readFile(filePath, (err, data) => {
			t.assert.equal(err, null);
			t.assert.equal(data, fileContent);
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=false", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri);
		fsWrapper.readdir(folderPath, { "withFileTypes": false }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files, directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/withFileTypes=true", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri);
		fsWrapper.readdir(folderPath, { "withFileTypes": true }, (err, files) => {
			t.assert.equal(err, null);
			t.assert.deepEqual(files?.map(({ name }) => name), directoryContent.map(([ name ]) => name));
			done();
		});
	});

	test("FsWrapper.readdir/options=undefined", (t, done) => {
		t.plan(2);
		const fsWrapper = new FsWrapper(fs, folderUri);
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

});
