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

const {getOctokit} = require('./lib/octokit.js');
const checks = require('./lib/checks.js');
const secrets = require('./secrets.json');

function createExpressApp(logMiddleware) {
  const app = express();

  app.use(logMiddleware);

  app.use(express.json({
    verify: (req, res, buf, encoding) => {
      const secret = secrets.github.webhook_secret;
      if (!secret) {
        return;
      }
      const signature = req.header('x-hub-signature');
      req.log.debug(`TODO: verify signature ${signature}`);
      if (signature != 'sha1=30816a3aa38e10f66819a3c84868db9cc87cd2a2') {
        throw new Error(`Signature mismatch`);
      }
    },
  }));

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.post('/webhook', (req, res) => {
    req.log.debug('/webhook invoked');

    const deliveryId = req.header('x-github-delivery');
    req.log.debug(`X-GitHub-Delivery: ${deliveryId}`);
    const event = req.header('x-github-event');

    const payload = req.body;

    req.log.debug('/webhook payload', payload);

    if (event !== 'check_suite') {
      req.log.info(`ignoring ${event} event`);
      res.end();
      return;
    }

    if (payload.action !== 'requested') {
      req.log.info(`ignoring check_suite action ${payload.action}`);
      res.end();
      return;
    }

    // TODO: confirm that we can safely trust the app/installation ID.
    const appId = payload.check_suite.app.id;
    const installationId = payload.installation.id;
    const data = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      head_branch: payload.check_suite.head_branch,
      head_sha: payload.check_suite.head_sha,
    };
    req.log.info('/webhook check_suite extracted data:', data);
    res.end();

    // Do the work async.
    setTimeout(() => {
      const octokit = getOctokit({
        appId,
        installationId,
        privateKey: secrets.github.private_key,
      });
      checks.create(octokit, data, req.log);
    });
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

  const app = createExpressApp(mw);

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
}

if (require.main === module) {
  main();
}
