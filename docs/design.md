# Flagging spec changes lacking tests

**Contributors**: @foolip, @tabatkins, @stephenmcgruer<br>
**Reviewers**: TODO<br>
**Status**: Draft

High-level idea: Bot that checks if commits or PRs with normative changes have a wpt PR (or existing test) associated with it. Complain or be useful if there isn’t.

## Objective

That all spec changes come with tests. Move from appreciative words in CONTRIBUTING.md to tooling that looks for connections between spec changes and test changes, and flags when none are found, and presents summaries of untested commits to make it easy for a spec editor to discover what needs testing.

## Background

This is an evolution of the “GitHub check for spec PRs linking to wpt PRs” project idea. Previous experiment in https://github.com/foolip/wpt-check-app.

## Requirements

Philip: Include our SLA requirements here too! Is it OK for our thing to be offline for a few minutes? A few days?
Tab: I think 90% SLA as a minimum req is fine, shooting for 99% generally. The reporting we hook up to this is okay to fall over for a bit, and manual usage (editors checking their commits to see what needs tests) can also wait if there are problems.

Data size: Maybe a few kilobytes per commit, to be pessimistic? And commits, across the repos we'd track, don't add up to more than a million or so, so storage space is just a few gigs.

Transaction rate: Not often, <100 qps for the foreseeable future I think?

Stephen:
> Depending on what exactly you mean by this, it's worth noting that the GitHub APIs have a limit of 1.3qps (5000 API requests every hour).
>
> So it's very much worth understanding how many spec changes happen an hour, and how many GitHub API requests would be needed for each one.
>
> Search API has separate limits incidentally, which is 2 qps I believe

From meeting discussion:

> If we subscribe to enough webhooks, we may be able to get the info from the webhook call itself and store it into e.g. a datastore, thus reducing the amount of data we need to call APIs for explicitly.

Johnny suggests adding a label to issues when tests are missing.

## Design ideas

For each change to a specification, we need to determine:
* Does this change affect any normative requirements?
* Are those requirements already covered by tests, or is there an in-flight test change adding/updating tests?

We want to flag changes that likely affect normative requirements and where no new or existing tests can be found. The “change” can be one of:
* An already landed commit in a repository to check post-landing.
* An in-flight pull request in a (GitHub) repository.
* A series of commits in a repository from a single pull request.
* A set of commits in a repository associated with a single issue.

From each such change, we try to find an associated test in web-platform-tests by:
* Finding associated issues (in the same repository) from the commit message.
* Finding associated pull requests using the GitHub API.
* Looking for links to web-platform-tests in the commit messages, issues and pull requests. Those links can be to an already landed test, or to issues or pull requests.
* Looking for any test, commit, issue or pull request in web-platform-tests that links back to any of the commits, issues or pull requests associated with the change. (backlinks)

In other words, we’re looking for a certain path in the directed graph implicit in GitHub. Being able to discover backlinks adds a fair bit of complexity to the design.

If a connection between spec and tests is found, we can flag that joyous fact. If we cannot find the connection, we flag that the spec change is missing tests. Either outcome is represented as a check with the [GitHub Checks API](https://developer.github.com/v3/checks/). Simply linking to the test in a pull request or issue should be enough to invalidate and update the check outcome. Ideally it should also be possible to tell the bot to ignore a change or to update its associations, similar to how Dependabot works.

* underlying data is {commit hash => WPT url}
* issues or PRs can link to multiple commits, bot would implicitly group all the commits to associate them all with the same WPTs, with commands to override if necessary
* should the status of a commit be exposed as GitHub Check? Useful for PRs?

## Mockups

### Pull requests

Example of what a [WebRTC PR](https://github.com/w3c/webrtc-pc/pull/2399) lacking tests would look like with the new check:

<img src="https://user-images.githubusercontent.com/498917/118605867-07a3b700-b7b7-11eb-83ad-169e7188ec30.png" width="690" height="141" alt="A failing check on a GitHub pull request saying no tests were found">

Tests were [later updated](https://github.com/web-platform-tests/wpt/pull/22561), but the pull request wouldn’t be updated once closed.

### Commits

For commit-then-review workflows, the checks would instead appear on the commits of the master branch. Mockup of this view:

<img src="https://user-images.githubusercontent.com/498917/118606067-42a5ea80-b7b7-11eb-94b1-e62577035e4c.png" width="800" height="233" alt="A failing check on a GitHub commit saying no tests found and action is required">

Tests were [linked in the issue](https://github.com/w3c/csswg-drafts/issues/5257#issuecomment-658971835), so the check would then automatically update to pass:

<img src="https://user-images.githubusercontent.com/498917/118606094-4afe2580-b7b7-11eb-8c0b-ff5749bee450.png" width="800" height="238" alt="A passing check on a GitHub commit saying tests were added">

### Details

The “Details” links would lead to a page on GitHub for the check run, which would be populated with information about what the check did, explaining the outcome. Perhaps:

> For pull request #1234 we looked for linked issues and pull requests in this repository in web-platform-tests. We found the following issue:
> [Link to an issue found in the same repository]
> However, we could not find any updates to web-platform-tests.
>
> If tests do exist or aren’t needed, you can tell the bot about it: ⌄
> [expandable list of bot commands here]

### Interacting with the bot

In order to silence the bot or tell it about a test it didn’t pick up, you would simply talk to it in a GitHub comment, similar to how [Dependabot](https://github.com/foolip/day-to-day/pull/39#issuecomment-548378187) works. Examples:

**@spec-test-bot** ignore

**@spec-test-bot** tested in [path or URL to test]

**@spec-test-bot** tracked by [URL to open issue]

## Dependencies

What software, tools or infrastructure do we depend on? What kind of maintenance will be required to keep this afloat over time?

## Detailed design

### Webhook integration

GitHub will notify the app of relevant events using [webhooks](https://developer.github.com/webhooks/).

The [`check_suite`](https://developer.github.com/v3/activity/events/types/#checksuiteevent) event with the action `requested` or `rerequested` and the [`check_run`](https://developer.github.com/v3/activity/events/types/#checkrunevent) event with the `rerequested` action will all cause the check to be started.

The [`X-Hub-Signature`](https://developer.github.com/webhooks/securing/) header will be verified.

### Authentication token

The [GitHub API](https://developer.github.com/v3/) will be used to look for links to web-platform-tests on PRs. This information itself is public, but unauthenticated requests will be [rate limited](https://developer.github.com/v3/rate_limit/).

As is [well documented](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app), to get an [installation token](https://developer.github.com/v3/apps/#create-a-new-installation-token) which can be used for the GitHub API, we have to first generate a JSON Web Token using the app ID and secret key. Using this, we can get an installation token valid for 1 hour.

TODO: How is the token updated hourly?

## Alternatives considered

TODO
