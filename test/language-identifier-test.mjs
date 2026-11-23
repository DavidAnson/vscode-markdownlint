import { test } from "node:test";

// eslint-disable-next-line @stylistic/quote-props
import packageJson from "../package.json" with { type: "json" };
import { markdownLanguageIdentifiers } from "../language-identifiers.mjs";

/** @typedef {import("node:test").TestContext} TestContext */

// https://code.visualstudio.com/docs/languages/identifiers
// JSON.stringify([...document.querySelectorAll("td > code")].map(node => node.innerText))
const validLanguageIdentifiers = new Set([
	"chatagent",
	"bat",
	"bibtex",
	"code-text-binary",
	"c",
	"csharp",
	"cpp",
	"clojure",
	"snippets",
	"coffeescript",
	"dockercompose",
	"css",
	"cuda-cpp",
	"dart",
	"diff",
	"dockerfile",
	"dotenv",
	"fsharp",
	"git-commit",
	"git-rebase",
	"go",
	"groovy",
	"handlebars",
	"hlsl",
	"html",
	"ignore",
	"ini",
	"instructions",
	"java",
	"javascript",
	"javascriptreact",
	"json",
	"jsonl",
	"jsonc",
	"julia",
	"juliamarkdown",
	"latex",
	"less",
	"log",
	"lua",
	"makefile",
	"markdown",
	"sql",
	"objective-c",
	"objective-cpp",
	"perl",
	"php",
	"plaintext",
	"powershell",
	"prompt",
	"properties",
	"jade",
	"python",
	"r",
	"raku",
	"razor",
	"restructuredtext",
	"ruby",
	"rust",
	"scss",
	"search-result",
	"shaderlab",
	"shellscript",
	"skill",
	"swift",
	"tex",
	"typescript",
	"typescriptreact",
	"vb",
	"wat",
	"xml",
	"xsl",
	"yaml"
]);

test.suite(import.meta.url.replace(/^.*?\/(?<name>[^/]*)$/u, "$<name>"), () => {

	test("language identifiers are unique", (/** @type {TestContext} */ t) => {
		t.plan(1);
		t.assert.equal(new Set(markdownLanguageIdentifiers).size, markdownLanguageIdentifiers.length);
	});

	test("language identifiers are valid", (/** @type {TestContext} */ t) => {
		t.plan(5);
		for (const markdownLanguageIdentifier of markdownLanguageIdentifiers) {
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.ok(validLanguageIdentifiers.has(markdownLanguageIdentifier));
		}
	});

	test("language identifiers have activation events", (/** @type {TestContext} */ t) => {
		t.plan(6);
		t.assert.equal(packageJson.activationEvents.length, markdownLanguageIdentifiers.length);
		for (const markdownLanguageIdentifier of markdownLanguageIdentifiers) {
			// eslint-disable-next-line node-test/no-conditional-assertion
			t.assert.ok(packageJson.activationEvents.includes(`onLanguage:${markdownLanguageIdentifier}`));
		}
	});

});
