# markdownlint

> Markdown/CommonMark linting and style checking for Visual Studio Code

## Intro

The [Markdown](https://en.wikipedia.org/wiki/Markdown) markup language is designed to be easy to read, write, and understand. It succeeds - and its flexibility is both a benefit and a drawback. Many styles are possible, so formatting can be inconsistent. Some constructs don't work well in all parsers and should be avoided. For example, [here are some common/troublesome Markdown constructs](https://gist.github.com/DavidAnson/006a6c2a2d9d7b21b025).

[markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) is a Visual Studio Code extension that includes a library of rules to encourage standards and consistency for Markdown files. It is powered by [markdownlint for Node.js](https://github.com/DavidAnson/markdownlint) which is based on [markdownlint for Ruby](https://github.com/mivok/markdownlint).

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

> For a tutorial, please see [Build an Amazing Markdown Editor Using Visual Studio Code and Pandoc](https://thisdavej.com/build-an-amazing-markdown-editor-using-visual-studio-code-and-pandoc/) by Dave Johnson.

## Rules

* **[MD001](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md001)** *heading-increment/header-increment* - Heading levels should only increment by one level at a time
* ~~**[MD002](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md002)** *first-heading-h1/first-header-h1* - First heading should be a top level heading~~
* **[MD003](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md003)** *heading-style/header-style* - Heading style
* **[MD004](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md004)** *ul-style* - Unordered list style
* **[MD005](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md005)** *list-indent* - Inconsistent indentation for list items at the same level
* ~~**[MD006](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md006)** *ul-start-left* - Consider starting bulleted lists at the beginning of the line~~
* **[MD007](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md007)** *ul-indent* - Unordered list indentation
* **[MD009](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md009)** *no-trailing-spaces* - Trailing spaces
* **[MD010](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md010)** *no-hard-tabs* - Hard tabs
* **[MD011](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md011)** *no-reversed-links* - Reversed link syntax
* **[MD012](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md012)** *no-multiple-blanks* - Multiple consecutive blank lines
* **[MD013](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md013)** *line-length* - Line length
* **[MD014](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md014)** *commands-show-output* - Dollar signs used before commands without showing output
* **[MD018](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md018)** *no-missing-space-atx* - No space after hash on atx style heading
* **[MD019](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md019)** *no-multiple-space-atx* - Multiple spaces after hash on atx style heading
* **[MD020](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md020)** *no-missing-space-closed-atx* - No space inside hashes on closed atx style heading
* **[MD021](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md021)** *no-multiple-space-closed-atx* - Multiple spaces inside hashes on closed atx style heading
* **[MD022](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md022)** *blanks-around-headings/blanks-around-headers* - Headings should be surrounded by blank lines
* **[MD023](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md023)** *heading-start-left/header-start-left* - Headings must start at the beginning of the line
* **[MD024](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md024)** *no-duplicate-heading/no-duplicate-header* - Multiple headings with the same content
* **[MD025](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md025)** *single-title/single-h1* - Multiple top level headings in the same document
* **[MD026](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md026)** *no-trailing-punctuation* - Trailing punctuation in heading
* **[MD027](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md027)** *no-multiple-space-blockquote* - Multiple spaces after blockquote symbol
* **[MD028](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md028)** *no-blanks-blockquote* - Blank line inside blockquote
* **[MD029](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md029)** *ol-prefix* - Ordered list item prefix
* **[MD030](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md030)** *list-marker-space* - Spaces after list markers
* **[MD031](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md031)** *blanks-around-fences* - Fenced code blocks should be surrounded by blank lines
* **[MD032](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md032)** *blanks-around-lists* - Lists should be surrounded by blank lines
* **[MD033](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md033)** *no-inline-html* - Inline HTML
* **[MD034](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md034)** *no-bare-urls* - Bare URL used
* **[MD035](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md035)** *hr-style* - Horizontal rule style
* **[MD036](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md036)** *no-emphasis-as-heading/no-emphasis-as-header* - Emphasis used instead of a heading
* **[MD037](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md037)** *no-space-in-emphasis* - Spaces inside emphasis markers
* **[MD038](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md038)** *no-space-in-code* - Spaces inside code span elements
* **[MD039](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md039)** *no-space-in-links* - Spaces inside link text
* **[MD040](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md040)** *fenced-code-language* - Fenced code blocks should have a language specified
* **[MD041](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md041)** *first-line-heading/first-line-h1* - First line in file should be a top level heading
* **[MD042](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md042)** *no-empty-links* - No empty links
* **[MD043](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md043)** *required-headings/required-headers* - Required heading structure
* **[MD044](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md044)** *proper-names* - Proper names should have the correct capitalization
* **[MD045](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md045)** *no-alt-text* - Images should have alternate text (alt text)
* **[MD046](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md046)** *code-block-style* - Code block style
* **[MD047](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md047)** *single-trailing-newline* - Files should end with a single newline character
* **[MD048](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md#md048)** *code-fence-style* - Code fence style

See [markdownlint's Rules.md file](https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md) for more details.

The following rules can be automatically fixed by moving the cursor to a rule violation (wavy underlined text) and typing `Ctrl+.` or clicking the light bulb icon.

* MD005 *list-indent*
* MD006 *ul-start-left*
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
* MD028 *no-blanks-blockquote*
* MD030 *list-marker-space*
* MD031 *blanks-around-fences*
* MD032 *blanks-around-lists*
* MD034 *no-bare-urls*
* MD037 *no-space-in-emphasis*
* MD038 *no-space-in-code*
* MD039 *no-space-in-links*
* MD044 *proper-names*
* MD047 *single-trailing-newline*

All violations of the above rules in the current document can be fixed at once by running the `markdownlint.fixAll` command, either from the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) (via `View|Command Palette...` or `Ctrl+Shift+P` then search for "markdownlint") or by [binding the command to a keyboard shortcut](https://code.visualstudio.com/docs/getstarted/keybindings).

To automatically fix these violations when saving a Markdown document, [configure Visual Studio Code's `editor.codeActionsOnSave` setting](https://code.visualstudio.com/docs/getstarted/settings) like so:

```json
"editor.codeActionsOnSave": {
    "source.fixAll.markdownlint": true
}
```

Automatically-applied fixes can be reverted by `Edit|Undo` or `Ctrl+Z`.

To temporarily disable linting of Markdown documents, run the `markdownlint.toggleLinting` command (from the Command Palette or by binding it to a keyboard shortcut). To re-enable linting, run the `markdownlint.toggleLinting` command again.

> **Note**: The effects of the `markdownlint.toggleLinting` command are reset when a new workspace is opened; linting defaults to enabled.

## Configure

### markdownlint.config

The default rule configuration disables `MD013`/`line-length` because many files include lines longer than the conventional 80 character limit:

```json
{
    "MD013": false
}
```

> **Note**: `MD002`/`first-heading-h1` is disabled by default because it has been deprecated in the `markdownlint` library.

Rules can be enabled, disabled, and customized by creating a [JSON](https://en.wikipedia.org/wiki/JSON) file named `.markdownlint.json` (or `.markdownlintrc`) or a [YAML](https://en.wikipedia.org/wiki/YAML) file named `.markdownlint.yaml` (or `.markdownlint.yml`) in any directory of a project. The rules defined by `.markdownlint{.json,.yaml,.yml,rc}` apply to Markdown files in the same directory and any sub-directories without their own `.markdownlint{.json,.yaml,.yml,rc}`.

> **Note**: `.markdownlint{.json,.yaml,.yml,rc}` is used only if a project has been opened. When no folder is open or a file is not part of the current project, normal user and workspace settings apply (see below). If multiple of these files are present in the same directory, `.markdownlint.json` will be used instead of `.markdownlint.yaml` will be used instead of `.markdownlint.yml` will be used instead of `.markdownlintrc`.

A custom configuration is often defined by a `.markdownlint.json` file in the root of the project:

```json
{
    "default": true,
    "MD003": { "style": "atx_closed" },
    "MD007": { "indent": 4 },
    "no-hard-tabs": false
}
```

To extend another configuration file, any configuration file can use the `extends` property to provide a relative path:

```json
{
    "extends": "../.markdownlint.json",
    "no-hard-tabs": true
}
```

Files referenced via `extends` do not need to be part of the current project (but usually are).

Rules can also be configured using Code's support for [user and workspace settings](https://code.visualstudio.com/docs/customization/userandworkspace).

The earlier configuration might look like the following in Code's user settings:

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

File paths referenced by `extends` from user settings are resolved relative to the user's home directory (ex: `%USERPROFILE%` on Windows or `$HOME` on macOS/Linux).

Configuration locations have the following precedence (in decreasing order):

* `.markdownlint{.json,.yaml,.yml,rc}` file in the same directory
* `.markdownlint{.json,.yaml,.yml,rc}` file in a parent directory
* `.markdownlint{.json,.yaml,.yml,rc}` file in the root of the project
* Visual Studio Code user/workspace settings
* Default configuration (see above)

Once a configuration is found, lower-precedence locations are ignored. Changes saved to any location take effect immediately. Files referenced via `extends` are not monitored for changes. Only the last two locations apply to files outside a project.

See [markdownlint's options.config section](https://github.com/DavidAnson/markdownlint#optionsconfig) for more information about rule configuration.

When a workspace is active, running the `markdownlint.openConfigFile` command (from the Command Palette or by binding it to a keyboard shortcut) will open an editor for the `.markdownlint{.json,.yaml,.yml,rc}` configuration file in the root of the workspace. If none of those files exist, `.markdownlint.json` will be created in the "pending save" state and opened in the editor.

### markdownlint.ignore

If a workspace contains generated content or other Markdown files that trigger warnings but cannot be fixed, it may be helpful to ignore (skip) those files when linting. This can be done by creating a file named `.markdownlintignore` in the root of the project or by updating the user/workspace configuration with a glob expression matching the relevant file names.

When using a `.markdownlintignore` file, the content of the file follows the rules for [gitignore](https://git-scm.com/docs/gitignore) and may look something like:

```ini
# Ignore Markdown files in the test directory
test/*.md
!test/except/this/one.md
```

An example of using Code's workspace configuration to ignore files might be:

```json
{
    "editor.someSetting": true,
    "markdownlint.ignore": [
        "ignore.md",
        "directory/ignore.md",
        "**/ignore.md",
        "**/*.md"
    ]
}
```

The globbing library used for matching `markdownlint.ignore` configuration values is [minimatch](https://github.com/isaacs/minimatch) with the `dot` and `nocomment` options enabled. Matching is case-sensitive and paths are resolved relative to the root of the workspace. The directory separator is `/`, even on Windows.

### markdownlint.run

By default, linting is performed as you type or edit a document. Linting is fast and efficient and should not interfere with typical workflows.

If you find this distracting, linting can be configured to run only when the document is saved. This looks like the following in Code's user settings:

```json
{
    "editor.someSetting": true,
    "markdownlint.run": "onSave"
}
```

> **Note**: When configured to run `onSave`, the list of reported issues will become outdated while the document is edited and will update when the document is saved.

### markdownlint.customRules

Custom rules can be specified in Code's user/workspace configuration to apply additional linting beyond the default set of rules. Custom rules are specified by the path to a JavaScript file or the path to an [npm](https://www.npmjs.com/) package exporting one rule or an array of rules.

Paths are normally relative to the root of the current workspace (or the Code install directory when no folder is open). Paths can also be absolute. When adding custom rules to a workspace, consider committing those rules under the `.vscode` directory where they will be separate from other workspace content and available to everyone who clones the repository.

Paths of the form `{extension}/path` are relative to the base directory of the Code extension named `extension` (which must already be installed). This syntax allows custom rules to be included within another extension's package and shared across multiple workspaces.

An example of Code's workspace settings for custom rules might look like the following:

```json
{
    "editor.someSetting": true,
    "markdownlint.customRules": [
        ".vscode/my-custom-rule.js",
        ".vscode/my-custom-rule-array.js",
        ".vscode/npm-package-for-custom-rule",
        "c:\\absolute\\path\\to\\custom\\rule.js",
        "{publisher.extension-name}/custom-rule.js",
        "{publisher.extension-name}/npm/rule/package"
    ]
}
```

To troubleshoot issues loading or running custom rules, please refer to diagnostic messages from the extension in Code's Output window.

For information about authoring custom rules, see [markdownlint/CustomRules](https://github.com/DavidAnson/markdownlint/blob/master/doc/CustomRules.md).

### markdownlint.customRulesAlwaysAllow

A list of workspace paths for which the user's response to the custom rule prompt was "Always allow". This setting is updated automatically by the extension, but can be modified to reset the prompt for a workspace.

> **Note**: This setting is only valid as a user setting, not as a workspace setting (where it could be set by a malicious workspace).

## Suppress

Individual warnings can be suppressed with inline comments:

```md
<!-- markdownlint-disable MD037 -->
deliberate space * in * emphasis
<!-- markdownlint-enable MD037 -->
```

The following snippets are available to help (press `Ctrl+Space` for IntelliSense suggestions):

* `markdownlint-disable`
* `markdownlint-enable`
* `markdownlint-capture`
* `markdownlint-restore`
* `markdownlint-disable-file`
* `markdownlint-enable-file`
* `markdownlint-configure-file`

See [markdownlint's configuration section](https://github.com/DavidAnson/markdownlint#configuration) for more details.

## History

See [CHANGELOG.md](CHANGELOG.md).
