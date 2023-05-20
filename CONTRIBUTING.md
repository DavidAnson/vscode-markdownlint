# Contributing

Interested in contributing? Great! Here are some suggestions to make it a good experience:

Start by [opening an issue][issues], whether to identify a problem or outline a change.
That issue should be used to discuss the situation and agree on a plan of action before writing code or sending a pull request.
Maybe the problem isn't really a problem, or maybe there are more things to consider.
If so, it's best to realize that before spending time and effort writing code that may not get used.

Match the coding style of the files you edit.
Although everyone has their own preferences and opinions, a pull request is not the right forum to debate them.

Package versions for `dependencies` and `devDependencies` should be specified exactly (also known as "pinning").
The short explanation is that doing otherwise eventually leads to inconsistent behavior and broken functionality.
(See [Pin your npm/yarn dependencies][pin-dependencies] for a longer explanation.)

Run tests before sending a pull request via `npm test` in the [usual manner][npm-scripts].
Tests should all pass on all platforms.

Pull requests should contain a single commit.
If necessary, squash multiple commits before creating the pull request and when making changes.
(See [Git Tools - Rewriting History][rewriting-history] for details.)

Open pull requests against the `next` branch.
That's where the latest changes are staged for the next release.
Include the text "(fixes #??)" at the end of the commit message so the pull request will be associated with the relevant issue.
End commit messages with a period (`.`).
Once accepted, the tag `fixed in next` will be added to the issue.
When the commit is merged to the main branch during the release process, the issue will be closed automatically.
(See [Closing issues using keywords][closing-keywords] for details.)

In order to maintain the permissive MIT license this project uses, all contributions must be your own and released under that license.
Code you add should be an original work and should not be copied from elsewhere.
Taking code from a different project, Stack Overflow, or the like is not allowed.
The use of tools such as GitHub Copilot that generate code from other projects is not allowed.

Thank you!

[closing-keywords]: https://help.github.com/articles/closing-issues-using-keywords/
[issues]: https://github.com/DavidAnson/vscode-markdownlint/issues
[npm-scripts]: https://docs.npmjs.com/misc/scripts
[pin-dependencies]: https://maxleiter.com/blog/pin-dependencies
[rewriting-history]: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History

<!-- markdownlint-disable-file required-headings -->
