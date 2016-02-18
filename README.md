# markdownlint

> Markdown linting and style checking for Visual Studio Code

## Intro

The [Markdown](https://en.wikipedia.org/wiki/Markdown) markup language is designed to be easy to read, write, and understand. It succeeds - and its flexibility is both a benefit and a drawback. Many styles are possible, so formatting can be inconsistent. Some constructs don't work well in all parsers and should be avoided. For example, [here are some common/troublesome Markdown constructs](https://gist.github.com/DavidAnson/006a6c2a2d9d7b21b025).

markdownlint is a Visual Studio Code extension that includes a library of rules to encourage standards and consistency for Markdown files. It is powered by [markdownlint for Node.js](https://github.com/DavidAnson/markdownlint) which is based on [markdownlint for Ruby](https://github.com/mivok/markdownlint).

## Install

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. Press `Ctrl+P` to open the Quick Open dialog
3. Type `ext install markdownlint` to find the extension
4. Press `Enter` or click the cloud icon to install it
5. Restart Visual Studio Code if prompted

## Use

When editing a Markdown file in Code with markdownlint installed, any lines that violate one of markdownlint's rules (see below) will trigger a *Warning* in the editor. Warnings are indicated by a wavy green underline and can also be seen by pressing `Ctrl+Shift+M` to open the Errors and Warnings dialog. Hover the mouse pointer over a green line to see the warning or press `F8` and `Shift+F8` to cycle through all the warnings (markdownlint warnings all begin with `MD###`). For more information about a markdownlint warning, place the cursor on a line and click the light bulb icon or press `Ctrl+.` to open the code action dialog. Clicking one of the warnings in the dialog will display that rule's help entry in the default web browser.

## Rules

* **MD001** *header-increment* - Header levels should only increment by one level at a time
* **MD002** *first-header-h1* - First header should be a h1 header
* **MD003** *header-style* - Header style
* **MD004** *ul-style* - Unordered list style
* **MD005** *list-indent* - Inconsistent indentation for list items at the same level
* **MD006** *ul-start-left* - Consider starting bulleted lists at the beginning of the line
* **MD007** *ul-indent* - Unordered list indentation
* **MD009** *no-trailing-spaces* - Trailing spaces
* **MD010** *no-hard-tabs* - Hard tabs
* **MD011** *no-reversed-links* - Reversed link syntax
* **MD012** *no-multiple-blanks* - Multiple consecutive blank lines
* **MD013** *line-length* - Line length
* **MD014** *commands-show-output* - Dollar signs used before commands without showing output
* **MD018** *no-missing-space-atx* - No space after hash on atx style header
* **MD019** *no-multiple-space-atx* - Multiple spaces after hash on atx style header
* **MD020** *no-missing-space-closed-atx* - No space inside hashes on closed atx style header
* **MD021** *no-multiple-space-closed-atx* - Multiple spaces inside hashes on closed atx style header
* **MD022** *blanks-around-headers* - Headers should be surrounded by blank lines
* **MD023** *header-start-left* - Headers must start at the beginning of the line
* **MD024** *no-duplicate-header* - Multiple headers with the same content
* **MD025** *single-h1* - Multiple top level headers in the same document
* **MD026** *no-trailing-punctuation* - Trailing punctuation in header
* **MD027** *no-multiple-space-blockquote* - Multiple spaces after blockquote symbol
* **MD028** *no-blanks-blockquote* - Blank line inside blockquote
* **MD029** *ol-prefix* - Ordered list item prefix
* **MD030** *list-marker-space* - Spaces after list markers
* **MD031** *blanks-around-fences* - Fenced code blocks should be surrounded by blank lines
* **MD032** *blanks-around-lists* - Lists should be surrounded by blank lines
* **MD033** *no-inline-html* - Inline HTML
* **MD034** *no-bare-urls* - Bare URL used
* **MD035** *hr-style* - Horizontal rule style
* **MD036** *no-emphasis-as-header* - Emphasis used instead of a header
* **MD037** *no-space-in-emphasis* - Spaces inside emphasis markers
* **MD038** *no-space-in-code* - Spaces inside code span elements
* **MD039** *no-space-in-links* - Spaces inside link text
* **MD040** *fenced-code-language* - Fenced code blocks should have a language specified
* **MD041** *first-line-h1* - First line in file should be a top level header

See [markdownlint's Rules.md file](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md) for more details.

## Configure

Rules can be enabled, disabled, and customized for an entire project by creating a [JSON](https://en.wikipedia.org/wiki/JSON) file named `.markdownlint.json` in the root folder of the project. Doing so overrides the default configuration (which disables `MD013` "Line length"):

```json
{
    "MD013": false
}
```

For example, a custom configuration file (including alias and tag) might look like:

```json
{
    "default": true,
    "MD003": { "style": "atx_closed" },
    "MD007": { "indent": 4 },
    "no-hard-tabs": false,
    "whitespace": false
}
```

See [markdownlint's options.config section](https://github.com/DavidAnson/markdownlint#optionsconfig) for more details. Changes to the configuration file take effect immediately.

## Suppress

Individual warnings can be suppressed with inline comments:

```md
<!-- markdownlint-disable MD037 -->
deliberate space * in * emphasis
<!-- markdownlint-enable MD037 -->
```

See [markdownlint's configuration section](https://github.com/DavidAnson/markdownlint#configuration) for more details.

## History

* 0.1.0 - Initial release
* 0.2.0 - Custom configuration
* 0.3.0 - Focused underlining
* 0.4.0 - Throttle linting
