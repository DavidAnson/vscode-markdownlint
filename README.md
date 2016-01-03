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

* **MD001** - Header levels should only increment by one level at a time
* **MD002** - First header should be a h1 header
* **MD003** - Header style
* **MD004** - Unordered list style
* **MD005** - Inconsistent indentation for list items at the same level
* **MD006** - Consider starting bulleted lists at the beginning of the line
* **MD007** - Unordered list indentation
* **MD009** - Trailing spaces
* **MD010** - Hard tabs
* **MD011** - Reversed link syntax
* **MD012** - Multiple consecutive blank lines
* **MD013** - Line length
* **MD014** - Dollar signs used before commands without showing output
* **MD018** - No space after hash on atx style header
* **MD019** - Multiple spaces after hash on atx style header
* **MD020** - No space inside hashes on closed atx style header
* **MD021** - Multiple spaces inside hashes on closed atx style header
* **MD022** - Headers should be surrounded by blank lines
* **MD023** - Headers must start at the beginning of the line
* **MD024** - Multiple headers with the same content
* **MD025** - Multiple top level headers in the same document
* **MD026** - Trailing punctuation in header
* **MD027** - Multiple spaces after blockquote symbol
* **MD028** - Blank line inside blockquote
* **MD029** - Ordered list item prefix
* **MD030** - Spaces after list markers
* **MD031** - Fenced code blocks should be surrounded by blank lines
* **MD032** - Lists should be surrounded by blank lines
* **MD033** - Inline HTML
* **MD034** - Bare URL used
* **MD035** - Horizontal rule style
* **MD036** - Emphasis used instead of a header
* **MD037** - Spaces inside emphasis markers
* **MD038** - Spaces inside code span elements
* **MD039** - Spaces inside link text
* **MD040** - Fenced code blocks should have a language specified
* **MD041** - First line in file should be a top level header

See [markdownlint's Rules.md file](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md) for more details.

## Configure

Rules can be enabled, disabled, and customized for an entire project by creating a [JSON](https://en.wikipedia.org/wiki/JSON) file named `.markdownlint.json` in the root folder of the project. Doing so overrides the default configuration (which disables `MD013` "Line length"):

```json
{
    "MD013": false
}
```

For example, a custom configuration file might look like:

```json
{
    "default": true,
    "MD003": { "style": "atx_closed" },
    "MD007": { "indent": 4 },
    "MD009": false,
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
