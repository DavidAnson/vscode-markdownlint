// @ts-check

import { default as assert } from "node:assert/strict";
import { test } from "node:test";
import { default as stringifyError } from "../stringify-error.mjs";

test("null", () => {
  const error = null;
  const actual = stringifyError(error);
  const expected = "[NO NAME]: null\n[NO STACK]";
  assert.equal(actual, expected);
});

test("number", () => {
  const error = 10;
  // @ts-ignore
  const actual = stringifyError(error);
  const expected = `[NO NAME]: ${error}\n[NO STACK]`;
  assert.equal(actual, expected);
});

test("string", () => {
  const error = "STRING";
  // @ts-ignore
  const actual = stringifyError(error);
  const expected = `[NO NAME]: "${error}"\n[NO STACK]`;
  assert.equal(actual, expected);
});

test("Error-like, name", () => {
  const error = {
    "name": "NAME"
  };
  // @ts-ignore
  const actual = stringifyError(error);
  const expected = `${error.name}: ${JSON.stringify(error)}\n[NO STACK]`;
  assert.equal(actual, expected);
});

test("Error-like, name/message", () => {
  const error = {
    "name": "NAME",
    "message": "MESSAGE"
  };
  const actual = stringifyError(error);
  const expected = `${error.name}: ${error.message}\n[NO STACK]`;
  assert.equal(actual, expected);
});

test("Error-like, name/message/stack", () => {
  const error = {
    "name": "NAME",
    "message": "MESSAGE",
    "stack": "STACK0\nSTACK1\nSTACK2"
  };
  const actual = stringifyError(error);
  const expected = `${error.name}: ${error.message}\n${error.stack}`;
  assert.equal(actual, expected);
});

test("Error-like, name/message/stack-with-heading", () => {
  const name = "NAME";
  const message = "MESSAGE";
  const stack = "STACK0\nSTACK1\nSTACK2";
  const error = {
    name,
    message,
    "stack": `${name}: ${message}\n${stack}`
  };
  const actual = stringifyError(error);
  const expected = `${name}: ${message}\n${stack}`;
  assert.equal(actual, expected);
});

test("Error", () => {
  const error = new Error("MESSAGE");
  const actual = stringifyError(error).replace(/^(    at ).*(stringify-error-test\.mjs)[\s\S]*$/m, "$1$2");
  const expected = "Error: MESSAGE\n    at stringify-error-test.mjs";
  assert.equal(actual, expected);
});
