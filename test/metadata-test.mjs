import fs from "node:fs/promises";
import { describe, test } from "node:test";

// eslint-disable-next-line @stylistic/quote-props
import packageJson from "../package.json" with { type: "json" };
// eslint-disable-next-line @stylistic/quote-props, n/no-unpublished-import
import markdownlintPackageJson from "../node_modules/markdownlint/package.json" with { type: "json" };

describe("metadata", () => {

	test("version numbers match", async (t) => {
		t.plan(292);
		const files = [
			"./package.json",
			"./CHANGELOG.md",
			"./README.md",
			"./markdownlint-cli2-config-schema.json",
			"./markdownlint-config-schema.json"
		];
		/** @type {[string, RegExp][]} */
		const packages = [
			[ packageJson.dependencies["markdownlint-cli2"], /(?:DavidAnson\/markdownlint-cli2|markdownlint-cli2\/blob)\/v(\d+\.\d+\.\d+)/gu ],
			[ markdownlintPackageJson.version, /(?:DavidAnson\/markdownlint|markdownlint\/blob)\/v(\d+\.\d+\.\d+)/gu ]
		];
		const contents = await Promise.all(files.map((file) => fs.readFile(file, "utf8")));
		for (const content of contents) {
			// eslint-disable-next-line init-declarations
			let match;
			for (const [ version, githubProjectOrFileRe ] of packages) {
				while ((match = githubProjectOrFileRe.exec(content)) !== null) {
					// eslint-disable-next-line node-test/no-conditional-assertion
					t.assert.equal(match[1], version);
				}
			}
			const firstChangelogRe = /\* (\d+\.\d+\.\d+) - /u;
			match = firstChangelogRe.exec(content);
			// eslint-disable-next-line node-test/no-conditional-in-test
			if (match) {
				const patchRe = /\.\d+$/u;
				// eslint-disable-next-line node-test/no-conditional-assertion
				t.assert.equal(match[1].replace(patchRe, ""), packageJson.version.replace(patchRe, ""));
			}
		}
	});

});
