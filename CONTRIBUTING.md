# Contributing

Interested in contributing?
Great!
Here are some suggestions to make it a good experience:

Start by [opening an issue][issues], whether to identify a problem or outline a change.
That issue should be used to discuss the situation and agree on a plan of action before writing code or sending a pull request.
Maybe the problem isn't really a problem, or maybe there are more things to consider.
If so, it's best to realize that before spending time and effort writing code that gets rejected.

Match the coding style of the files you edit.
Although everyone has their own preferences and opinions, a pull request is not the right forum to debate them.

Do not add new [`dependencies` to `package.json`][deps].

Package versions for `dependencies` and `devDependencies` should be specified exactly (also known as "pinning").
Doing otherwise causes inconsistent behavior and broken functionality.
(See [Why I pin dependency versions in Node.js packages][pinning] for a longer explanation.)

Run basic tests via `npm test`.
Run UI tests via `npm run test-ui`.
Lint by running `npm run lint`.
Run a full continuous integration pass before opening a pull request via `npm run ci`.

Pull requests should contain a single commit with a commit message that is a brief sentence with punctuation.
Include the text "(fixes #??)" at the end of the commit message so the pull request will be associated with the relevant issue.
Squash multiple commits before creating the pull request or when making updates.
(See [Git Tools - Rewriting History][rewriting] for details.)

Create all pull requests for the `next` branch which contains the latest changes ready for release.
Once accepted, the tag `fixed in next` will be added to the issue.
When that commit is merged to the `main` branch during the release process, the issue will be closed automatically.

Refrain from using slang or meaningless placeholder text in code, documentation, or tests.
Sample content can be "text", "code", "heading", etc..
URLs should use [example.com][example].
Profanity is not allowed.

In order to maintain the permissive [MIT license][mit] this project has, all contributions must be your own and released under the MIT license.
Code you add should be an original work and should not be copied from elsewhere.
Reusing code from a different project, Stack Overflow, etc. is not allowed.
The use of tools such as Copilot, ChatGPT, Claude, etc. that produce output from a [large language model (LLM)][llm] is not allowed because LLMs reuse code from other projects.

Thank you!

[deps]: https://docs.npmjs.com/cli/v11/configuring-npm/package-json#dependencies
[example]: https://wikipedia.org/wiki/Example.com
[issues]: https://github.com/DavidAnson/vscode-markdownlint/issues
[llm]: https://wikipedia.org/wiki/Large_language_model
[mit]: https://choosealicense.com/licenses/mit/
[rewriting]: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History
[pinning]: https://dlaa.me/blog/post/versionpinning

<!-- markdownlint-disable-file required-headings -->
