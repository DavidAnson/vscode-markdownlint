// @ts-check

import posixPath from "../posix-path.mjs";

import { describe, test } from "node:test";

/* eslint-disable unicorn/prefer-string-raw */

const posixPathScenarios = [
	[ "/Users/user/Project", "/Users/user/Project" ],
	[ "/Users/user/Project/file.txt", "/Users/user/Project/file.txt" ],
	[ "C:\\Users\\user\\Project", "C:/Users/user/Project" ],
	[ "C:\\Users\\user\\Project\\file.txt", "C:/Users/user/Project/file.txt" ],
	[ "\\\\hostname\\c$\\Users\\user\\Project", "//hostname/c$/Users/user/Project" ],
	[ "\\\\hostname\\c$\\Users\\user\\Project\\file.txt", "//hostname/c$/Users/user/Project/file.txt" ]
];

describe("posix-path", () => {

	test("scenarios", (t) => {
		t.plan(posixPathScenarios.length);
		for (const [ path, expected ] of posixPathScenarios) {
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.equal(posixPath(path), expected);
		}
	});

});
