// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const bunyan = require('bunyan');
const express = require('express');
const {LoggingBunyan} = require('@google-cloud/logging-bunyan');
const {Webhooks} = require('@octokit/webhooks');

const {getOctokit} = require('./lib/octokit.js');
const checks = require('./lib/checks.js');
const secrets = require('./secrets.json');

function createExpressApp(logger) {
  const app = express();

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  const webhooks = new Webhooks({
    secret: secrets.github.webhook_secret,
    path: '/webhook',
  });

  app.use(webhooks.middleware);

  webhooks.on('check_run', (event) => {
    logger.debug({event}, 'check_run event');

    const {payload} = event;

    if (payload.action === 'rerequested') {
      logger.warn('restarting check run not implemented');
    } else if (payload.action === 'requested_action') {
      logger.warn('handling user actions not implemented');
    }
  });

  webhooks.on('check_suite', (event) => {
    logger.debug({event}, 'check_suite event');

    const {payload} = event;

    if (payload.action !== 'requested' && payload.action !== 'rerequested') {
      return;
    }

    const appId = payload.check_suite.app.id;
    const installationId = payload.installation.id;
    const data = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      head_branch: payload.check_suite.head_branch,
      head_sha: payload.check_suite.head_sha,
    };

    // Do the work async.
    logger.info({data}, 'scheduling check creation');
    setTimeout(() => {
      const octokit = getOctokit({
        appId,
        installationId,
        privateKey: secrets.github.private_key,
      });
      checks.create(octokit, data, logger);
    });
  });

  webhooks.on('issue_comment', (event) => {
    logger.debug({event}, 'issue_comment event');
    logger.warn('comment reactions not implemented');
  });

  webhooks.on('pull_request_review_comment', (event) => {
    logger.debug({event}, 'pull_request_review_comment event');
    logger.warn('comment reactions not implemented');
  });

  webhooks.on('error', (error) => {
    logger.warn(error, 'webhook error');
  });

  return app;
}

function main() {
  let stream;
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    // On AppEngine, use @google-cloud/logging-bunyan.
    const loggingBunyan = new LoggingBunyan();
    stream = loggingBunyan.stream('debug');
  } else {
    // Locally, use bunyan directly. Pipe through bunyan for nicer output.
    stream = {stream: process.stdout, level: 'debug'};
  }
  const logger = bunyan.createLogger({
    name: 'spec-test-bot',
    streams: [stream],
  });

  const app = createExpressApp(logger);

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
}

if (require.main === module) {
  main();
}
