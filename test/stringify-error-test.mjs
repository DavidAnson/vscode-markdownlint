// @ts-check

import { default as assert } from "node:assert/strict";
import { test } from "node:test";
import { default as stringifyError } from "../stringify-error.mjs";

test("null", () => {
	const error = null;
	const actual = stringifyError(error);
	const expected = "[NO NAME]: null\nstack:\n [NO STACK]";
	assert.equal(actual, expected);
});

test("number", () => {
	const error = 10;
	// @ts-ignore
	const actual = stringifyError(error);
	const expected = `[NO NAME]: ${error}\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("string", () => {
	const error = "STRING";
	// @ts-ignore
	const actual = stringifyError(error);
	const expected = `[NO NAME]: "${error}"\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("object", () => {
	const error = {};
	// @ts-ignore
	const actual = stringifyError(error);
	const expected = `[NO NAME]: ${JSON.stringify(error)}\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name", () => {
	const error = {
		"name": "NAME"
	};
	// @ts-ignore
	const actual = stringifyError(error);
	const expected = `${error.name}: ${JSON.stringify(error)}\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name/message", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE"
	};
	const actual = stringifyError(error);
	const expected = `${error.name}: ${error.message}\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/stack", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"stack": "STACK0\nSTACK1\nSTACK2"
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n STACK0\n STACK1\n STACK2`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/stack-with-heading", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"stack": "NAME: MESSAGE\nSTACK0\nSTACK1\nSTACK2"
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n STACK0\n STACK1\n STACK2`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/cause", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"cause": {
			"name": "name",
			"message": "message"
		}
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n [NO STACK]\ncause:\n name: message\n stack:\n  [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/errors-none", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"errors": []
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/errors-one", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"errors": [
			{
				"name": "name",
				"message": "message"
			}
		]
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n [NO STACK]\nerrors:\n name: message\n stack:\n  [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error-like, name/message/errors-two", () => {
	const error = {
		"name": "NAME",
		"message": "MESSAGE",
		"errors": [
			{
				"name": "name0",
				"message": "message0"
			},
			"string"
		]
	};
	const actual = stringifyError(error);
	const expected = `NAME: MESSAGE\nstack:\n [NO STACK]\nerrors:\n name0: message0\n stack:\n  [NO STACK]\n [NO NAME]: "string"\n stack:\n  [NO STACK]`;
	assert.equal(actual, expected);
});

test("Error, nested", () => {
	// @ts-ignore
	const error = new Error("MESSAGE0", { "cause": new Error("MESSAGE1") } );
	const actual =
		stringifyError(error).
			split("\n").
			filter((s) => !s.includes("at ") || s.includes("stringify-error-test")).
			map((s) => s.replace(/^(\s*at ).*(stringify-error-test).*$/, "$1$2")).
			join("\n");
	const expected = "Error: MESSAGE0\nstack:\n at stringify-error-test\ncause:\n Error: MESSAGE1\n stack:\n  at stringify-error-test";
	assert.equal(actual, expected);
});
