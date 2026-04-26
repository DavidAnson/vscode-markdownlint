// @ts-check

import os from "node:os";
import { describe, test } from "node:test";
import replaceVariables from "../replace-variables.mjs";

const folderPath = "/Users/user/folder";
const documentPath = `${folderPath}/document.txt`;
const workspacePath = "/Users/user/workspace";

const osLike = {
	"homedir": () => "/home/dir"
};

const uriLikeBase = {
	"scheme": "scheme",
	"authority": "authority",
	"path": "path",
	"query": "query",
	"fragment": "fragment",
	"with": () => uriLikeBase,
	"toJSON": () => "toJSON"
};

const documentUriLike = {
	...uriLikeBase,
	"fsPath": documentPath
}

const workspaceUriLike = {
	...uriLikeBase,
	"fsPath": workspacePath
}

const vscodeLike = {
	"workspace": {
		"getWorkspaceFolder": () => ({
			"uri": workspaceUriLike
		})
	}
};

describe("replace-variables", () => {

	test("undefined", (t) => {
		t.plan(1);
		const input = undefined;
		const expected = "";
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("null", (t) => {
		t.plan(1);
		const input = null;
		const expected = "";
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("empty", (t) => {
		t.plan(1);
		const input = "";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("no variables", (t) => {
		t.plan(1);
		const input = "input with no variables";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("unsupported variable", (t) => {
		t.plan(1);
		const input = "${unsupported}";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("unsupported variables", (t) => {
		t.plan(1);
		const input = "input ${with} some #${unsupported}# variables";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("partial variable missing open", (t) => {
		t.plan(1);
		const input = "{userHome}";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("partial variable missing close", (t) => {
		t.plan(1);
		const input = "${userHome";
		const expected = input;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("userHome with os undefined", (t) => {
		t.plan(1);
		const input = "${userHome}";
		const expected = input;
		const actual = replaceVariables(
			input,
			documentUriLike,
			vscodeLike,
			// @ts-ignore
			undefined
		);
		t.assert.equal(actual, expected);
	});

	test("userHome with os empty", (t) => {
		t.plan(1);
		const input = "${userHome}";
		const expected = input;
		const actual = replaceVariables(
			input,
			documentUriLike,
			vscodeLike,
			// @ts-ignore
			{},
		);
		t.assert.equal(actual, expected);
	});

	test("userHome with os.homedir undefined", (t) => {
		t.plan(1);
		const input = "${userHome}";
		const expected = input;
		const actual = replaceVariables(
			input,
			documentUriLike,
			vscodeLike,
			// @ts-ignore
			{ "homedir": undefined },
		);
		t.assert.equal(actual, expected);
	});

	test("userHome with os shim", (t) => {
		t.plan(1);
		const input = "${userHome}";
		const expected = osLike.homedir();
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("userHome with os module", (t) => {
		t.plan(1);
		const input = "${userHome}";
		const expected = os.homedir();
		const actual = replaceVariables(input, documentUriLike, vscodeLike, os);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode undefined", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = folderPath;
		const actual = replaceVariables(
			input,
			documentUriLike,
			// @ts-ignore
			undefined,
			osLike
		);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode empty", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = folderPath;
		const actual = replaceVariables(
			input,
			documentUriLike,
			// @ts-ignore
			{},
			osLike,
		);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode.workspace empty", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = folderPath;
		const actual = replaceVariables(
			input,
			documentUriLike,
			// @ts-ignore
			{ "workspace": {} },
			osLike,
		);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode.workspace.getWorkspaceFolder undefined", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = folderPath;
		const actual = replaceVariables(
			input,
			documentUriLike,
			// @ts-ignore
			{ "workspace": { "getWorkspaceFolder": undefined } },
			osLike,
		);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode.workspace.getWorkspaceFolder returning undefined", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = folderPath;
		const actual = replaceVariables(
			input,
			documentUriLike,
			{ "workspace": { "getWorkspaceFolder": () => undefined } },
			osLike,
		);
		t.assert.equal(actual, expected);
	});

	test("workspaceFolder with vscode shim", (t) => {
		t.plan(1);
		const input = "${workspaceFolder}";
		const expected = workspacePath;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("variables embedded", (t) => {
		t.plan(1);
		const input = "input with ${userHome} embedded";
		const expected = `input with ${osLike.homedir()} embedded`;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

	test("variables embedded multiple", (t) => {
		t.plan(1);
		const input = "input ${userHome} with #${userHome}# embedded ${userHome}${workspaceFolder}${userHome} multiple";
		const expected = `input ${osLike.homedir()} with #${osLike.homedir()}# embedded ${osLike.homedir()}${vscodeLike.workspace.getWorkspaceFolder().uri.fsPath}${osLike.homedir()} multiple`;
		const actual = replaceVariables(input, documentUriLike, vscodeLike, osLike);
		t.assert.equal(actual, expected);
	});

});
