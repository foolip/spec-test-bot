# @spec-test-bot

This GitHub App aims to provide a [check](https://developer.github.com/v3/checks/) for PRs to verify that changes to web platform specs are accompanied by PRs or issues on [web-platform-tests](https://github.com/web-platform-tests/wpt). This is effectively tooling to serve as a reminder of [testing policy](https://github.com/foolip/testing-in-standards/blob/master/policy.md), although it will be easy to bypass/ignore.

## Running

Before you can run or deploy, copy `secrets.sample.json` to `secrets.json` and
fill it out from the GitHub App settings page.

Then run `npm run start-dev`. The server will run on port 8080 by default,
but this can be overridden with the `PORT` environment variable.

## Deploying

You will need `gcloud` from [Google Cloud SDK](https://cloud.google.com/sdk) on your `PATH` and a working `secrets.json`.

Then run `npm run deploy`. This will deploy to [spec-test-bot.appspot.com](https://spec-test-bot.appspot.com/).
