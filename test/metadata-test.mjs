import fs from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Imports a file as JSON.
 * Avoids "ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time".
 * @param {ImportMeta} meta ESM import.meta object.
 * @param {string} file JSON file to import.
 * @returns {Promise<any>} JSON object.
 */
const importWithTypeJson = async (meta, file) => (
  // @ts-ignore
  JSON.parse(await fs.readFile(path.resolve(path.dirname(fileURLToPath(meta.url)), file)))
);

const packageJson = await importWithTypeJson(import.meta, "../package.json");
const markdownlintPackageJson = await importWithTypeJson(import.meta, "../node_modules/markdownlint/package.json");

describe("metadata", () => {

	test("version numbers match", async (t) => {
		t.plan(184);
		const files = [
			"./package.json",
			"./CHANGELOG.md",
			"./README.md",
			"./markdownlint-cli2-config-schema.json",
			"./markdownlint-config-schema.json"
		];
		const packages = [
			// eslint-disable-next-line prefer-named-capture-group
			[ packageJson.dependencies["markdownlint-cli2"], /(?:DavidAnson\/markdownlint-cli2|markdownlint-cli2\/blob)\/v(\d+\.\d+\.\d+)/gu ],
			// eslint-disable-next-line prefer-named-capture-group
			[ markdownlintPackageJson.version, /(?:DavidAnson\/markdownlint|markdownlint\/blob)\/v(\d+\.\d+\.\d+)/gu ]
		];
		const contents = await Promise.all(files.map((file) => fs.readFile(file, "utf8")));
		for (const content of contents) {
			// eslint-disable-next-line init-declarations
			let match;
			for (const [version, githubProjectOrFileRe] of packages) {
				while ((match = githubProjectOrFileRe.exec(content)) !== null) {
					t.assert.equal(match[1], version);
				}
			}
			// eslint-disable-next-line prefer-named-capture-group
			const firstChangelogRe = /\* (\d+\.\d+\.\d+) - /u;
			match = firstChangelogRe.exec(content);
			if (match) {
				t.assert.equal(match[1], packageJson.version);
			}
		}
	});

});
