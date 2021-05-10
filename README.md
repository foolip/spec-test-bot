# @spec-test-bot

This GitHub App aims to provide a [check](https://developer.github.com/v3/checks/) for PRs to verify that changes to web platform specs are accompanied by PRs or issues on [web-platform-tests](https://github.com/web-platform-tests/wpt). This is effectively tooling to serve as a reminder of [testing policy](https://github.com/foolip/testing-in-standards/blob/master/policy.md), although it will be easy to bypass/ignore.

## Setup

The web service in this repository is part of the [@spec-test-bot GitHub App](https://github.com/apps/spec-test-bot). If creating a new GitHub App for testing or hosting a separate instance, Set the webhook to the [`/api/webhook`](https://spec-test-bot.appspot.com/api/webhook) endpoint and add a webhook secret.

Now, copy `secrets.sample.json` to `secrets.json` and fill it out from the GitHub App settings page, and fill in a random `webhook_secret` as well.

## Running Locally

Then run `npm run start-dev`. The server will run on port 8080 by default, but this can be overridden with the `PORT` environment variable. (A local instance won't get any webhooks from GitHub, but can be used for debugging.)

To run the tests, run `npm test`. This will automatically start the server and doesn't depend on the above.

## Deploying to App Engine

You will need `gcloud` from [Google Cloud SDK](https://cloud.google.com/sdk) on your `PATH` and a working `secrets.json`.

Then run `npm run deploy`. This will deploy to [spec-test-bot.appspot.com](https://spec-test-bot.appspot.com/).
