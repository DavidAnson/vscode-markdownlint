// @ts-check

import { describe, test } from "node:test";
import { default as stringifyError } from "../stringify-error.mjs";

describe("stringify-error", () => {

	test("null", (t) => {
		t.plan(1);
		const error = null;
		const actual = stringifyError(error);
		const expected = "[NO NAME]: null\nstack:\n [NO STACK]";
		t.assert.equal(actual, expected);
	});

	test("number", (t) => {
		t.plan(1);
		const error = 10;
		// @ts-ignore
		const actual = stringifyError(error);
		const expected = `[NO NAME]: 10\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("string", (t) => {
		t.plan(1);
		const error = "STRING";
		// @ts-ignore
		const actual = stringifyError(error);
		const expected = `[NO NAME]: "STRING"\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("object", (t) => {
		t.plan(1);
		const error = {};
		// @ts-ignore
		const actual = stringifyError(error);
		const expected = `[NO NAME]: {}\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME"
		};
		// @ts-ignore
		const actual = stringifyError(error);
		const expected = `NAME: {"name":"NAME"}\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE"
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/stack", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE",
			"stack": "STACK0\nSTACK1\nSTACK2"
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n STACK0\n STACK1\n STACK2`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/stack-with-heading", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE",
			"stack": "NAME: MESSAGE\nSTACK0\nSTACK1\nSTACK2"
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n STACK0\n STACK1\n STACK2`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/cause", (t) => {
		t.plan(1);
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
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/errors-none", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE",
			"errors": []
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/errors-one", (t) => {
		t.plan(1);
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
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/errors-two", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE",
			"errors": [
				{
					"name": "name",
					"message": "message"
				},
				"string"
			]
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n [NO STACK]\nerrors:\n name: message\n stack:\n  [NO STACK]\n [NO NAME]: "string"\n stack:\n  [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	test("Error-like, name/message/errors-nested", (t) => {
		t.plan(1);
		const error = {
			"name": "NAME",
			"message": "MESSAGE",
			"errors": [
				{
					"name": "name",
					"message": "message",
					"cause": {
						"name": "Name",
						"message": "Message",
					},
					"errors": [
						{
							"name": "NaMe",
							"message": "MeSsAgE",
						}
					]
				}
			]
		};
		const actual = stringifyError(error);
		const expected = `NAME: MESSAGE\nstack:\n [NO STACK]\nerrors:\n name: message\n stack:\n  [NO STACK]\n cause:\n  Name: Message\n  stack:\n   [NO STACK]\n errors:\n  NaMe: MeSsAgE\n  stack:\n   [NO STACK]`;
		t.assert.equal(actual, expected);
	});

	function generalize (output) {
		return output.
			split("\n").
			filter((s) => !s.includes("at ") || s.includes("stringify-error-test")).
			map((s) => s.replace(/^(\s*at ).*(stringify-error-test).*$/, "$1$2")).
			join("\n");
	}

	test("Error, cause", (t) => {
		t.plan(1);
		// @ts-ignore
		const error = new Error("MESSAGE0", { "cause": new Error("MESSAGE1") } );
		const actual = generalize(stringifyError(error));
		const expected = "Error: MESSAGE0\nstack:\n at stringify-error-test\ncause:\n Error: MESSAGE1\n stack:\n  at stringify-error-test";
		t.assert.equal(actual, expected);
	});

	test("AggregateError, nested", (t) => {
		t.plan(1);
		// @ts-ignore
		const error = new AggregateError([ new Error("MESSAGE1"), new AggregateError([ new Error("MESSAGE3") ], "MESSAGE2") ], "MESSAGE0");
		const actual = generalize(stringifyError(error));
		const expected = "AggregateError: MESSAGE0\nstack:\n at stringify-error-test\nerrors:\n Error: MESSAGE1\n stack:\n  at stringify-error-test\n AggregateError: MESSAGE2\n stack:\n  at stringify-error-test\n errors:\n  Error: MESSAGE3\n  stack:\n   at stringify-error-test";
		t.assert.equal(actual, expected);
	});

});
