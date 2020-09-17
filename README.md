# @spec-test-bot

This GitHub App aims to provide a [check](https://developer.github.com/v3/checks/) for PRs to verify that changes to web platform specs are accompanied by PRs or issues on [web-platform-tests](https://github.com/web-platform-tests/wpt). This is effectively tooling to serve as a reminder of [testing policy](https://github.com/foolip/testing-in-standards/blob/master/policy.md), although it will be easy to bypass/ignore.

## Running

To run the server, first define the following environment variables:
 * `APP_ID` is the numeric ID of the GitHub App
 * `APP_PRIVATE_KEY` is the [private key](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/) (contents, not filename)
 * `APP_WEBHOOK_SECRET` (optional) is the [webhook secret](https://developer.github.com/webhooks/securing/) used to verify the `X-Hub-Signature` header
 * `PORT` (optional) is the port to run on. The default is 8080.

Then, just run `npm start`.
