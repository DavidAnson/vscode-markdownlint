# markdownlint

> Markdown/CommonMark linting and style checking for Visual Studio Code

## Introduction

The [Markdown](https://en.wikipedia.org/wiki/Markdown) markup language is designed to be easy to read, write, and understand. It succeeds - and its flexibility is both a benefit and a drawback. Many styles are possible, so formatting can be inconsistent. Some constructs don't work well in all parsers and should be avoided. For example, [here are some common/troublesome Markdown constructs](https://gist.github.com/DavidAnson/006a6c2a2d9d7b21b025).

[markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) is an extension for the [Visual Studio Code editor](https://code.visualstudio.com) that includes a library of rules to encourage standards and consistency for Markdown files. It is powered by the [markdownlint library for Node.js](https://github.com/DavidAnson/markdownlint) (which was inspired by [markdownlint for Ruby](https://github.com/mivok/markdownlint)). Linting is performed by the [`markdownlint-cli2` engine](https://github.com/DavidAnson/markdownlint-cli2), which can be used in conjunction with this extension to provide command-line support for scripts and continuous integration scenarios. The [`markdownlint-cli2-action` GitHub Action](https://github.com/marketplace/actions/markdownlint-cli2-action) uses the same engine and can be integrated with project workflows.

## Install

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. Press `Ctrl+P`/`Ctrl+P`/`⌘P` to open the Quick Open dialog
3. Type `ext install markdownlint` to find the extension
4. Click the `Install` button, then the `Enable` button

OR

1. Press `Ctrl+Shift+X`/`Ctrl+Shift+X`/`⇧⌘X` to open the Extensions tab
2. Type `markdownlint` to find the extension
3. Click the `Install` button, then the `Enable` button

OR

1. Open a command-line prompt
2. Run `code --install-extension DavidAnson.vscode-markdownlint`

## Use

When editing a Markdown file in VS Code with `markdownlint` installed, any lines that violate one of `markdownlint`'s rules (see below) will trigger a *Warning* in the editor. Warnings are indicated by a wavy green underline and can also be seen by pressing `Ctrl+Shift+M`/`Ctrl+Shift+M`/`⇧⌘M` to open the Errors and Warnings dialog. Hover the mouse pointer over a green line to see the warning or press `F8` and `Shift+F8`/`Shift+F8`/`⇧F8` to cycle through all the warnings (markdownlint warnings all begin with `MD###`). For more information about a `markdownlint` warning, place the cursor on a line and click the light bulb icon or press `Ctrl+.`/`Ctrl+.`/`⌘.` to open the quick fix dialog. Clicking one of the warnings in the dialog will display that rule's help entry in the default web browser.

> For a tutorial, please see [Build an Amazing Markdown Editor Using Visual Studio Code and Pandoc](https://thisdavej.com/build-an-amazing-markdown-editor-using-visual-studio-code-and-pandoc/) by Dave Johnson.

By default, `markdownlint` will scan and report issues for files that VS Code treats as Markdown. You can see what language mode the current file has in the Status Bar at the bottom of the window and you can [change the language mode for the current file](https://code.visualstudio.com/docs/languages/overview#_change-the-language-for-the-selected-file). If you have a custom file type that VS Code should always treat as Markdown, you can [associate that file extension with the `markdown` language identifier](https://code.visualstudio.com/docs/languages/overview#_add-a-file-extension-to-a-language).

## Rules

* **[MD001](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md001.md)** *heading-increment* - Heading levels should only increment by one level at a time
* **[MD003](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md003.md)** *heading-style* - Heading style
* **[MD004](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md004.md)** *ul-style* - Unordered list style
* **[MD005](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md005.md)** *list-indent* - Inconsistent indentation for list items at the same level
* **[MD007](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md007.md)** *ul-indent* - Unordered list indentation
* **[MD009](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md009.md)** *no-trailing-spaces* - Trailing spaces
* **[MD010](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md010.md)** *no-hard-tabs* - Hard tabs
* **[MD011](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md011.md)** *no-reversed-links* - Reversed link syntax
* **[MD012](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md012.md)** *no-multiple-blanks* - Multiple consecutive blank lines
* **[MD013](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md013.md)** *line-length* - Line length
* **[MD014](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md014.md)** *commands-show-output* - Dollar signs used before commands without showing output
* **[MD018](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md018.md)** *no-missing-space-atx* - No space after hash on atx style heading
* **[MD019](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md019.md)** *no-multiple-space-atx* - Multiple spaces after hash on atx style heading
* **[MD020](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md020.md)** *no-missing-space-closed-atx* - No space inside hashes on closed atx style heading
* **[MD021](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md021.md)** *no-multiple-space-closed-atx* - Multiple spaces inside hashes on closed atx style heading
* **[MD022](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md022.md)** *blanks-around-headings* - Headings should be surrounded by blank lines
* **[MD023](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md023.md)** *heading-start-left* - Headings must start at the beginning of the line
* **[MD024](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md024.md)** *no-duplicate-heading* - Multiple headings with the same content
* **[MD025](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md025.md)** *single-title/single-h1* - Multiple top level headings in the same document
* **[MD026](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md026.md)** *no-trailing-punctuation* - Trailing punctuation in heading
* **[MD027](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md027.md)** *no-multiple-space-blockquote* - Multiple spaces after blockquote symbol
* **[MD028](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md028.md)** *no-blanks-blockquote* - Blank line inside blockquote
* **[MD029](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md029.md)** *ol-prefix* - Ordered list item prefix
* **[MD030](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md030.md)** *list-marker-space* - Spaces after list markers
* **[MD031](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md031.md)** *blanks-around-fences* - Fenced code blocks should be surrounded by blank lines
* **[MD032](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md032.md)** *blanks-around-lists* - Lists should be surrounded by blank lines
* **[MD033](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md033.md)** *no-inline-html* - Inline HTML
* **[MD034](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md034.md)** *no-bare-urls* - Bare URL used
* **[MD035](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md035.md)** *hr-style* - Horizontal rule style
* **[MD036](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md036.md)** *no-emphasis-as-heading* - Emphasis used instead of a heading
* **[MD037](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md037.md)** *no-space-in-emphasis* - Spaces inside emphasis markers
* **[MD038](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md038.md)** *no-space-in-code* - Spaces inside code span elements
* **[MD039](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md039.md)** *no-space-in-links* - Spaces inside link text
* **[MD040](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md040.md)** *fenced-code-language* - Fenced code blocks should have a language specified
* **[MD041](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md041.md)** *first-line-heading/first-line-h1* - First line in file should be a top level heading
* **[MD042](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md042.md)** *no-empty-links* - No empty links
* **[MD043](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md043.md)** *required-headings* - Required heading structure
* **[MD044](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md044.md)** *proper-names* - Proper names should have the correct capitalization
* **[MD045](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md045.md)** *no-alt-text* - Images should have alternate text (alt text)
* **[MD046](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md046.md)** *code-block-style* - Code block style
* **[MD047](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md047.md)** *single-trailing-newline* - Files should end with a single newline character
* **[MD048](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md048.md)** *code-fence-style* - Code fence style
* **[MD049](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md049.md)** *emphasis-style* - Emphasis style should be consistent
* **[MD050](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md050.md)** *strong-style* - Strong style should be consistent
* **[MD051](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md051.md)** *link-fragments* - Link fragments should be valid
* **[MD052](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md052.md)** *reference-links-images* - Reference links and images should use a label that is defined
* **[MD053](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md053.md)** *link-image-reference-definitions* - Link and image reference definitions should be needed
* **[MD054](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md054.md)** *link-image-style* - Link and image style
* **[MD055](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md055.md)** *table-pipe-style* - Table pipe style
* **[MD056](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md056.md)** *table-column-count* - Table column count
* **[MD058](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md058.md)** *blanks-around-tables* - Tables should be surrounded by blank lines
* **[MD059](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md059.md)** *descriptive-link-text* - Link text should be descriptive

See [markdownlint's Rules.md file](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/Rules.md) for more details.

The following rules can be automatically fixed by moving the cursor to a rule violation (wavy underlined text) and typing `Ctrl+.`/`Ctrl+.`/`⌘.` or clicking the light bulb icon.

* MD004 *ul-style*
* MD005 *list-indent*
* MD007 *ul-indent*
* MD009 *no-trailing-spaces*
* MD010 *no-hard-tabs*
* MD011 *no-reversed-links*
* MD012 *no-multiple-blanks*
* MD014 *commands-show-output*
* MD018 *no-missing-space-atx*
* MD019 *no-multiple-space-atx*
* MD020 *no-missing-space-closed-atx*
* MD021 *no-multiple-space-closed-atx*
* MD022 *blanks-around-headings*
* MD023 *heading-start-left*
* MD026 *no-trailing-punctuation*
* MD027 *no-multiple-space-blockquote*
* MD030 *list-marker-space*
* MD031 *blanks-around-fences*
* MD032 *blanks-around-lists*
* MD034 *no-bare-urls*
* MD037 *no-space-in-emphasis*
* MD038 *no-space-in-code*
* MD039 *no-space-in-links*
* MD044 *proper-names*
* MD047 *single-trailing-newline*
* MD049 *emphasis-style*
* MD050 *strong-style*
* MD051 *link-fragments*
* MD053 *link-image-reference-definitions*
* MD054 *link-image-style*
* MD058 *blanks-around-tables*

## Commands

### Fix

All of a document's violations of the automatically-fixable rules above can be fixed for you.

`markdownlint` registers itself as a [source code formatter](https://code.visualstudio.com/docs/editor/codebasics#_formatting) for Markdown files and can be invoked by the `Format Document`/`editor.action.formatDocument` and `Format Selection`/`editor.action.formatSelection` commands, either from the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) (via `View|Command Palette...` or `Ctrl+Shift+P`/`Ctrl+Shift+P`/`⇧⌘P`) or via the default key bindings of `Shift+Alt+F`/`Ctrl+Shift+I`/`⇧⌥F` (to format the document) and `Ctrl+K Ctrl+F`/`Ctrl+K Ctrl+F`/`⌘K ⌘F` (to format the selection).
To automatically format when saving or pasting into a Markdown document, [configure Visual Studio Code's `editor.formatOnSave` or `editor.formatOnPaste` settings](https://code.visualstudio.com/docs/getstarted/settings#_language-specific-editor-settings) like so:

```json
"[markdown]": {
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true
},
```

`markdownlint` also contributes the `markdownlint.fixAll` command which fixes a document's violations in one step and can be run from the Command Palette or by [binding the command to a keyboard shortcut](https://code.visualstudio.com/Docs/editor/keybindings).
To automatically fix violations when saving a Markdown document, configure Visual Studio Code's `editor.codeActionsOnSave` setting like so:

```json
"editor.codeActionsOnSave": {
    "source.fixAll.markdownlint": true
}
```

Automatically-applied fixes from either method can be reverted by `Edit|Undo` or `Ctrl+Z`/`Ctrl+Z`/`⌘Z`.

### Workspace

To lint all Markdown files in the current workspace, run the `markdownlint.lintWorkspace` command (from the Command Palette or by binding it to a keyboard shortcut).
This will use [`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2), the same engine that powers the extension, to lint all files and output the results to a new terminal in the "Terminal" panel.
Results will also appear in the "Problems" panel (`Ctrl+Shift+M`/`Ctrl+Shift+M`/`⇧⌘M`) because of the [problem matcher](https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher) included with the extension.
Entries in the "Problems" panel can be clicked to open the corresponding file in the editor.
To customize the files that are included/excluded when linting a workspace, configure the `markdownlint.lintWorkspaceGlobs` setting (see below) at workspace or user scope.

### Disable

To temporarily disable linting of Markdown documents, run the `markdownlint.toggleLinting` command (from the Command Palette or by binding it to a keyboard shortcut). To re-enable linting, run the `markdownlint.toggleLinting` command again.

> **Note**: The effects of the `markdownlint.toggleLinting` command are reset when a new workspace is opened; linting defaults to enabled.

## Configure

By default (i.e., without customizing anything), all rules are enabled *except* [`MD013`/`line-length`](https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md013.md) because many files include lines longer than the conventional 80 character limit:

```json
{
    "MD013": false
}
```

Rules can be enabled, disabled, and customized by creating a [JSON](https://en.wikipedia.org/wiki/JSON) file named `.markdownlint.jsonc`/`.markdownlint.json` or a [YAML](https://en.wikipedia.org/wiki/YAML) file named `.markdownlint.yaml`/`.markdownlint.yml` or a [JavaScript](https://en.wikipedia.org/wiki/JavaScript) file named `.markdownlint.cjs` in any directory of a project.
Additionally, options (which include rules and other settings) can be configured by creating a JSON file named `.markdownlint-cli2.jsonc` or a YAML file named `.markdownlint-cli2.yaml` or a JavaScript file named `.markdownlint-cli2.cjs` in any directory of a project.
Rules can also be configured using VS Code's support for [user and workspace settings](https://code.visualstudio.com/docs/customization/userandworkspace).

> For more information about configuration file precedence and complete examples, see the [Configuration section of the markdownlint-cli2 README.md](https://github.com/DavidAnson/markdownlint-cli2#configuration).

A custom rule configuration is often defined by a `.markdownlint.json` file in the root of the project:

```json
{
    "MD003": { "style": "atx_closed" },
    "MD007": { "indent": 4 },
    "no-hard-tabs": false
}
```

To extend another configuration file, use the `extends` property to provide a relative path:

```json
{
    "extends": "../.markdownlint.json",
    "no-hard-tabs": true
}
```

Files referenced via `extends` do not need to be part of the current project (but usually are).

Configuration sources have the following precedence (in decreasing order):

* `.markdownlint-cli2.{jsonc,yaml,cjs}` file in the same or parent directory
* `.markdownlint.{jsonc,json,yaml,yml,cjs}` file in the same or parent directory
* Visual Studio Code user/workspace settings (see [markdownlint.config](#markdownlintconfig) and [markdownlint.configFile](#markdownlintconfigfile) below)
* Default configuration (see above)

Configuration changes saved to any location take effect immediately.
Files referenced via `extends` are not monitored for changes.
Inherited configuration can be explicitly disabled (or re-enabled) in any configuration file.

When a workspace is open, running the `markdownlint.openConfigFile` command (from the Command Palette or by binding it to a keyboard shortcut) will open an editor for the `.markdownlint-cli2.{jsonc,yaml,cjs}` or `.markdownlint.{jsonc,json,yaml,yml,cjs}` configuration file in the root of the workspace.
If none of these files exist, a new `.markdownlint.json` containing the default rule configuration will be opened in the editor in the "pending save" state.

> **Note**: Because JavaScript is cached by VS Code after being loaded, edits to `.markdownlint.cjs`/`.markdownlint-cli2.cjs` require a restart of VS Code.

### markdownlint.config

> **Note**: Using a project-local configuration file is preferred because doing so works with command-line tools and is easier for collaboration.

The configuration above might look like the following in VS Code's user settings file:

```json
{
    "editor.someSetting": true,
    "markdownlint.config": {
        "MD003": { "style": "atx_closed" },
        "MD007": { "indent": 4 },
        "no-hard-tabs": false
    }
}
```

When using `extends` in this context:

* File paths referenced by `extends` from configuration files within a workspace are resolved relative to that configuration file.
* When running VS Code locally:
  * File paths referenced by `extends` from user settings are resolved relative to the user's home directory (e.g., `%USERPROFILE%` on Windows or `$HOME` on macOS/Linux).
  * File paths referenced by `extends` from workspace settings are resolved relative to the workspace folder.
  * VS Code's [predefined variables](https://code.visualstudio.com/docs/reference/variables-reference) `${userHome}` and `${workspaceFolder}` can be used within an `extends` path from user or workspace settings to override the default behavior.

### markdownlint.configFile

The default behavior of storing configuration files in the root of a project works well most of the time.
However, projects that need to store configuration files in a different location can set `configFile` to the project-relative path of that file.
All [`markdownlint-cli2` configuration files used with `--config`](https://github.com/DavidAnson/markdownlint-cli2?tab=readme-ov-file#command-line) are supported.

This looks like the following in VS Code's user settings:

```json
{
    "editor.someSetting": true,
    "markdownlint.configFile": "./config/.markdownlint.jsonc"
}
```

If [markdownlint.config](#markdownlintconfig) is also set, the settings from `configFile` take precedence.

### markdownlint.focusMode

By default, all linting issues are logged and highlighted as you type or edit a document. This includes "transient" issues like `MD009`/`no-trailing-spaces` such as when typing at the end of a line.

If you find this distracting, linting can be configured to ignore issues on the same line as the cursor. This looks like the following in VS Code's user settings:

```json
{
    "editor.someSetting": true,
    "markdownlint.focusMode": true
}
```

To ignore issues on the *N* lines above and below the cursor, set `focusMode` to a positive integer representing the number of lines to ignore in each direction:

```json
{
    "editor.someSetting": true,
    "markdownlint.focusMode": 2
}
```

The value of `2` in the example above will ignore issues on the line with the cursor, the 2 lines above it, and the 2 lines below it.

> **Note**: This is an application-level setting and is only valid in user (not workspace) settings.

### markdownlint.run

By default, linting is performed as you type or edit a document. Linting is fast and efficient and should not interfere with typical workflows.

If you find this distracting, linting can be configured to run only when the document is saved. This looks like the following in VS Code's user settings:

```json
{
    "editor.someSetting": true,
    "markdownlint.run": "onSave"
}
```

> **Note**: When configured to run `onSave`, the list of reported issues will become outdated while the document is edited and will update when the document is saved.

### markdownlint.customRules

Custom rules can be specified in VS Code's user/workspace configuration to apply additional linting beyond the default set of rules. Custom rules are specified by the path to a JavaScript file or the name of or path to an [npm](https://www.npmjs.com/) package exporting one rule or an array of rules (search "markdownlint-rule" on [npmjs.com](https://www.npmjs.com/)).

Paths are typically relative to the root of the current workspace and should begin with `./` to [differentiate the relative path from a module identifier](https://nodejs.org/docs/latest-v18.x/api/modules.html#file-modules). Paths can be absolute and begin with `/`, though this is discouraged because it does not work reliably across different machines. If implementing custom rules in a workspace, consider committing the rule code under the `.vscode` directory where it will be separate from other workspace content and available to everyone who clones the repository. Paths of the form `{extension}/path` are relative to the base directory of the VS Code extension named `extension` (which must already be installed). This syntax allows custom rules to be included within another extension's package, though this is discouraged because it introduces a subtle dependency on the other extension.

An example of VS Code's workspace settings for custom rules might look like the following:

```json
{
    "editor.someSetting": true,
    "markdownlint.customRules": [
        "./.vscode/my-custom-rule.js",
        "./.vscode/my-custom-rule-array.js",
        "./.vscode/npm-package-for-custom-rule",
        "/absolute/path/to/custom/rule.js",
        "{publisher.extension-name}/custom-rule.js",
        "{publisher.extension-name}/npm/rule/package"
    ]
}
```

For information about authoring custom rules, see [the `markdownlint` documentation for custom rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md).

> **Note**: Custom rules can also be specified (in a portable way other tools will recognize) via the [`customRules` property in `.markdownlint-cli2.{jsonc,yaml,cjs}`](https://github.com/DavidAnson/markdownlint-cli2#configuration).
> In `markdownlint-cli2` configuration files, the `modulePaths` property can be used in conjunction to specify one or more additional paths for resolving module references.
> This can be used to work around the VS Code limitation that globally-installed Node modules are unavailable by setting `modulePaths` to the location of the global module path (typically `/usr/local/lib` on macOS/Linux or `~/AppData/Roaming/npm` on Windows).

### markdownlint.lintWorkspaceGlobs

The globs used when linting a workspace with the `markdownlint.lintWorkspace` command match VS Code's concept of "Markdown files that matter":

```jsonc
[
    // Source: https://github.com/microsoft/vscode/blob/main/extensions/markdown-basics/package.json
    "**/*.{md,mkd,mdwn,mdown,markdown,markdn,mdtxt,mdtext,workbook}",
    // Source: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/search/browser/search.contribution.ts
    "!**/*.code-search",
    "!**/bower_components",
    "!**/node_modules",
    // Additional exclusions
    "!**/.git",
    "!**/vendor"
]
```

This list can be customized at workspace and user scope to include or exclude additional files and directories.
For more information about syntax, see the ["Command Line" section of the markdownlint-cli2 documentation](https://github.com/DavidAnson/markdownlint-cli2#command-line).

## Suppress

Individual warnings can be suppressed with comments in the Markdown file itself:

```markdown
<!-- markdownlint-disable MD037 -->
deliberate space * in * emphasis
<!-- markdownlint-enable MD037 -->
```

More information about inline suppressions can be found in the [Configuration section of the `markdownlint` README.md](https://github.com/DavidAnson/markdownlint#configuration).

## Snippets

The following snippets are available when editing a Markdown document (press `Ctrl+Space`/`Ctrl+Space`/`⌃Space` for IntelliSense suggestions):

* `markdownlint-disable`
* `markdownlint-enable`
* `markdownlint-disable-line`
* `markdownlint-disable-next-line`
* `markdownlint-capture`
* `markdownlint-restore`
* `markdownlint-disable-file`
* `markdownlint-enable-file`
* `markdownlint-configure-file`

## Security

Running JavaScript from custom rules, `markdown-it` plugins, or configuration files (such as `.markdownlint.cjs`/`.markdownlint-cli2.cjs`) could be a security risk, so VS Code's [Workspace Trust setting](https://code.visualstudio.com/docs/editor/workspace-trust) is honored to block JavaScript for untrusted workspaces.

## History

See [CHANGELOG.md](CHANGELOG.md).
