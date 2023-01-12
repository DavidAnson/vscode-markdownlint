# Changes

* 0.49.0 - Improved rules and documentation
* 0.48.0 - New rules, better linting in browser
* 0.47.0 - Miscellaneous improvements
* 0.46.0 - New rules, document formatting, better path handling
* 0.45.0 - Add linting for workspace
* 0.44.0 - Support virtual file systems
* 0.43.0 - Web worker support
* 0.42.0 - Add "focus mode" setting
* 0.41.0 - Workspace trust, virtual workspaces
* 0.40.0 - Switched to `markdownlint-cli2` (see below)
* 0.39.0 - Improved rules, new fix
* 0.38.0 - Improved rules, schemas, new snippet
* 0.37.0 - Improved rules, extends, schema
* 0.36.0 - Add command, improve diagnostics
* 0.35.0 - Improved rules, .markdownlintignore
* 0.34.0 - Improved rules, new fix, JSONC config
* 0.33.0 - Improved rules, new fix, new snippets
* 0.32.0 - Implement fix-on-save
* 0.31.0 - Automatically fix more rule violations
* 0.30.0 - Improved rules, startup performance
* 0.29.0 - Add snippets
* 0.28.0 - Improved rules, capture/restore
* 0.27.0 - Improved rules and custom rule handling
* 0.26.0 - Rule, code action, and performance improvements
* 0.25.0 - Improved startup performance
* 0.24.0 - Improved rules, custom links, math blocks
* 0.23.0 - UI and custom rule improvements
* 0.22.0 - Code action improvements
* 0.21.0 - Custom rule improvements
* 0.20.0 - Enable actions in Problems pane
* 0.19.0 - Improved rules
* 0.18.0 - Add support for YAML config files
* 0.17.0 - Add support for ignoring files
* 0.16.0 - Add support for custom rules
* 0.15.0 - Add option to lint on type or save
* 0.14.0 - Improved rules
* 0.13.0 - New/improved rules
* 0.12.0 - Add support for multi-root workspaces
* 0.11.0 - Automatically fix some rule violations
* 0.10.0 - Ignore comments/TOML, improved rules
* 0.9.0 - Nested .markdownlint.json config
* 0.8.0 - Improved rules, shareable config
* 0.7.0 - New/improved rules, more details
* 0.6.0 - Improved rules and underlining
* 0.5.0 - New/improved rules, schema for settings
* 0.4.0 - Throttle linting
* 0.3.0 - Focused underlining
* 0.2.0 - Custom configuration
* 0.1.0 - Initial release

## About release 0.40.0

Originally, this extension called into the [`markdownlint`](https://github.com/DavidAnson/markdownlint) library and needed to reimplement support for shared concepts like configuration files, etc.. With this release, the extension calls into [`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2) to perform linting. This brings complete support for everything that tool supports, including the powerful `.markdownlint-cli2.{jsonc,yaml,js}` format that allows configuration inheritance along with different rules, custom rules, and [`markdown-it` plugins](https://www.npmjs.com/search?q=keywords:markdown-it-plugin) for each directory. This change means a few things behave differently or are no longer supported:

* The default configuration (to disable `MD013`/`line-length`) is allowed to propagate into an open project even if that project has its own configuration. (This was partially true before.) To change behavior within a project (e.g., for complete consistency with CLI behavior) do so explicitly with any of the configuration mechanisms (for example, via `"line-length": true`).
* The `.markdownlintrc` configuration file is no longer used. This format was supported for consistency with [`markdownlint-cli`](https://github.com/igorshubovych/markdownlint-cli) and was only partially implemented. Any of the configuration file formats used by `markdownlint-cli2` can be used instead.
* The "Open this document's configuration" action is no longer present in VS Code. This feature attempted to determine the single configuration source for the current file, but now that configuration inheritance is supported, there may no longer be a single configuration file.
* The `markdownlint.customRulesAlwaysAllow` setting is no longer used because custom rules (along with `markdown-it` plugins, `.markdownlint.cjs`, and `.markdownlint-cli2.cjs`) are automatically loaded by `markdownlint-cli2`. To prevent running external JavaScript like this, set the new `markdownlint.blockJavaScript` configuration to `true` in VS Code's user settings.
* Custom rule paths specified by the `markdownlint.customRules` setting must begin with `./` when they are relative paths (this was previously optional).

<!-- markdownlint-disable-file required-headings -->
