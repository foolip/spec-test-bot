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
const cloudBunyan = require('@google-cloud/logging-bunyan');
const express = require('express');
const {Webhooks} = require('@octokit/webhooks');

const {getOctokit} = require('./lib/octokit.js');
const checks = require('./lib/checks.js');
const secrets = require('./secrets.json');

function createExpressApp(logger, logMiddleware) {
  const app = express();

  app.use(logMiddleware);

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  const webhooks = new Webhooks({
    secret: secrets.github.webhook_secret,
    path: '/webhook',
  });

  app.use(webhooks.middleware);

  webhooks.on('check_suite', ({id, name, payload}) => {
    if (payload.action !== 'requested') {
      logger.info(`ignoring check_suite action ${payload.action}`);
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
    logger.info('Scheduling check creation for:', data);
    setTimeout(() => {
      const octokit = getOctokit({
        appId,
        installationId,
        privateKey: secrets.github.private_key,
      });
      checks.create(octokit, data, logger);
    });
  });

  webhooks.on('error', (error) => {
    logger.error(error);
  });

  return app;
}

async function main() {
  let logger;
  let mw;
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    // On AppEngine, use @google-cloud/logging-bunyan middleware.
    ({logger, mw} = await cloudBunyan.express.middleware());
  } else {
    // Locally, log to stdout and make `req.log` available.
    logger = bunyan.createLogger({
      name: 'spec-test-bot',
      streams: [{stream: process.stdout, level: 'debug'}],
    });
    mw = (req, res, next) => {
      req.log = logger;
      next();
    };
  }

  const app = createExpressApp(logger, mw);

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
}

if (require.main === module) {
  main();
}
