// @ts-check

import { default as assert } from "node:assert/strict";
import { describe, test } from "node:test";
import { default as convertIgnores} from "../convert-ignores.cjs";

describe("convert-ignores", () => {

	test("empty", () => {
		assert.deepEqual(convertIgnores([]), []);
	});

	test("LICENSE", () => {
		const result = convertIgnores([ "LICENSE" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("LICENSE"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("LICENSE.md"));
		assert.ok(!result[0]("LICENSE.markdown"));
		assert.ok(!result[0]("license"));
	});

	test("README.md", () => {
		const result = convertIgnores([ "README.md" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("README.md"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("README"));
		assert.ok(!result[0]("README_md"));
		assert.ok(!result[0]("README.markdown"));
		assert.ok(!result[0]("readme.md"));
	});

	test("*.md", () => {
		const result = convertIgnores([ "*.md" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("README.md"));
		assert.ok(result[0]("readme.md"));
		assert.ok(result[0]("LICENSE.md"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("README.markdown"));
		assert.ok(!result[0]("path/README.md"));
	});

	test("*.@(md|markdown)", () => {
		const result = convertIgnores([ "*.@(md|markdown)" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("README.md"));
		assert.ok(result[0]("README.markdown"));
		assert.ok(result[0]("readme.md"));
		assert.ok(result[0]("readme.markdown"));
		assert.ok(result[0]("LICENSE.md"));
		assert.ok(result[0]("LICENSE.markdown"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("path/README.md"));
		assert.ok(!result[0]("path/README.markdown"));
	});

	test("*/*.md", () => {
		const result = convertIgnores([ "*/*.md" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("path/README.md"));
		assert.ok(result[0]("path/readme.md"));
		assert.ok(result[0]("path/LICENSE.md"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("README.md"));
		assert.ok(!result[0]("path/invalid"));
		assert.ok(!result[0]("path/path/invalid"));
		assert.ok(!result[0]("path/path/README.md"));
	});

	test("**/*.md", () => {
		const result = convertIgnores([ "**/*.md" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("README.md"));
		assert.ok(result[0]("readme.md"));
		assert.ok(result[0]("LICENSE.md"));
		assert.ok(result[0]("path/README.md"));
		assert.ok(result[0]("path/path/README.md"));
		assert.ok(result[0]("path/.path/README.md"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("path/invalid"));
		assert.ok(!result[0]("path/path/invalid"));
	});

	test("README.md and LICENSE", () => {
		const result = convertIgnores([ "README.md", "LICENSE" ]);
		assert.equal(result.length, 2);
		assert.ok(result[0]("README.md"));
		assert.ok(result[1]("LICENSE"));
		assert.ok(!result[0]("invalid"));
		assert.ok(!result[0]("LICENSE"));
		assert.ok(!result[1]("invalid"));
		assert.ok(!result[1]("README.md"));
	});

	test("#README", () => {
		const result = convertIgnores([ "#README" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("#README"));
		assert.ok(!result[0]("invalid"));
	});

	test("\\*", () => {
		const result = convertIgnores([ "\\*" ]);
		assert.equal(result.length, 1);
		assert.ok(result[0]("*"));
		assert.ok(!result[0]("invalid"));
	});

});
