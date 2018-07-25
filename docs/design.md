## Webhook integration

GitHub will notify the app of relevant events using [webhooks](https://developer.github.com/webhooks/).

The [`check_suite`](https://developer.github.com/v3/activity/events/types/#checksuiteevent) event with the action `requested` or `rerequested` and the [`check_run`](https://developer.github.com/v3/activity/events/types/#checkrunevent) event with the `rerequested` action will all cause the check to be started.

The [`X-Hub-Signature`](https://developer.github.com/webhooks/securing/) header will be verified.

## Authentication token

The [GitHub API](https://developer.github.com/v3/) will be used to look for links to web-platform-tests on PRs. This information itself is public, but unauthenticated requests will be [rate limited](https://developer.github.com/v3/rate_limit/).

As is [well documented](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app), to get an [installation token](https://developer.github.com/v3/apps/#create-a-new-installation-token) which can be used for the GitHub API, we have to first sign a JSON Web Token with the app ID using the app secret key. Using this, we can an API token valid for 1 hour.

TODO: How is the token updated hourly?
