# markdownlint

> Markdown linting and style checking for Visual Studio Code

## Intro

The [Markdown](https://en.wikipedia.org/wiki/Markdown) markup language is designed to be easy to read, write, and understand. It succeeds - and its flexibility is both a benefit and a drawback. Many styles are possible, so formatting can be inconsistent. Some constructs don't work well in all parsers and should be avoided. For example, [here are some common/troublesome Markdown constructs](https://gist.github.com/DavidAnson/006a6c2a2d9d7b21b025).

markdownlint is a Visual Studio Code extension that includes a library of rules to encourage standards and consistency for Markdown files. It is powered by [markdownlint for Node.js](https://github.com/DavidAnson/markdownlint) which is based on [markdownlint for Ruby](https://github.com/mivok/markdownlint).

## Install

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. Press `Ctrl+P` to open the Quick Open dialog
3. Type `ext install markdownlint` to find the extension
4. Click the `Install` button, then the `Enable` button

OR

1. Press `Ctrl+Shift+X` to open the Extensions tab
2. Type `markdownlint` to find the extension
3. Click the `Install` button, then the `Enable` button

OR

1. Open a command-line prompt
2. Run `code --install-extension DavidAnson.vscode-markdownlint`

## Use

When editing a Markdown file in Code with markdownlint installed, any lines that violate one of markdownlint's rules (see below) will trigger a *Warning* in the editor. Warnings are indicated by a wavy green underline and can also be seen by pressing `Ctrl+Shift+M` to open the Errors and Warnings dialog. Hover the mouse pointer over a green line to see the warning or press `F8` and `Shift+F8` to cycle through all the warnings (markdownlint warnings all begin with `MD###`). For more information about a markdownlint warning, place the cursor on a line and click the light bulb icon or press `Ctrl+.` to open the code action dialog. Clicking one of the warnings in the dialog will display that rule's help entry in the default web browser.

> For a tutorial, please see [Build an Amazing Markdown Editor Using Visual Studio Code and Pandoc](http://thisdavej.com/build-an-amazing-markdown-editor-using-visual-studio-code-and-pandoc/) by Dave Johnson.

## Rules

* **MD001** *header-increment* - Header levels should only increment by one level at a time
* **MD002** *first-header-h1* - First header should be a top level header
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
* **MD042** *no-empty-links* - No empty links
* **MD043** *required-headers* - Required header structure

See [markdownlint's Rules.md file](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md) for more details.

## Configure

The default rule configuration disables `MD013`/`line-length` "Line length" because many files include lines longer than the initial limit of 80 characters:

```json
{
    "MD013": false
}
```

Rules can be enabled, disabled, and customized by creating a [JSON](https://en.wikipedia.org/wiki/JSON) file named `.markdownlint.json` in the root folder of a project.

For example, a custom configuration file might look like:

```json
{
    "default": true,
    "MD003": { "style": "atx_closed" },
    "MD007": { "indent": 4 },
    "no-hard-tabs": false
}
```

Rules can also be configured using Code's support for [user and workspace settings](https://code.visualstudio.com/docs/customization/userandworkspace).

For example, the same configuration via `settings.json` might look like:

```json
{
    "editor.someSetting": true,
    "markdownlint.config": {
        "default": true,
        "MD003": { "style": "atx_closed" },
        "MD007": { "indent": 4 },
        "no-hard-tabs": false
    }
}
```

Locations have the following precedence (in decreasing order):

* `.markdownlint.json` file in the root of the project
* Visual Studio Code user/workspace settings
* Default configuration (above)

Changes saved to any of the files take effect immediately.

See [markdownlint's options.config section](https://github.com/DavidAnson/markdownlint#optionsconfig) for more information about rule configuration.

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
* 0.5.0 - New/improved rules, schema for settings
