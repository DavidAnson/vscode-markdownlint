// @ts-check

import path from "node:path";
import posixPath from "../posix-path.mjs";
import { describe, test } from "node:test";

/* eslint-disable unicorn/prefer-string-raw */

const testScenariosPosix = [
	[ "/Users/user/Project", "/Users/user/Project" ],
	[ "/Users/user/Project/file.txt", "/Users/user/Project/file.txt" ]
];
const testScenariosWin32 = [
	[ "C:\\Users\\user\\Project", "C:/Users/user/Project" ],
	[ "C:\\Users\\user\\Project\\file.txt", "C:/Users/user/Project/file.txt" ],
	[ "\\\\hostname\\c$\\Project", "//hostname/c$/Project" ],
	[ "\\\\hostname\\c$\\Project\\file.txt", "//hostname/c$/Project/file.txt" ]
];

describe("posix-path", () => {

	test("POSIX scenarios", (t) => {
		t.plan(testScenariosPosix.length);
		for (const [ input, expected ] of testScenariosPosix) {
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.equal(posixPath(input, path.posix.sep), expected);
		}
	});

	test("Win32 scenarios", (t) => {
		t.plan(testScenariosWin32.length);
		for (const [ input, expected ] of testScenariosWin32) {
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.equal(posixPath(input, path.win32.sep), expected);
		}
	});

});
