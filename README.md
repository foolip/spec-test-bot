== Running ==

To run the server, first define the following environment variables:
 * `APP_ID` is the numeric ID of the GitHub App
 * `APP_PRIVATE_KEY` is the [private key](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/) (contents, not filename)
 * `APP_WEBHOOK_SECRET` (optional) is the [webhook secret](https://developer.github.com/webhooks/securing/) used to verify the `X-Hub-Signature` header
 * `APP_PORT` (optional) is the port to run on. The default is 8080.

Then, just run `npm start`.
