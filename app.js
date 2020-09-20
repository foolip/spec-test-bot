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

const {createHmac} = require('crypto');
const bunyan = require('bunyan');
const express = require('express');
const {LoggingBunyan} = require('@google-cloud/logging-bunyan');

const {getOctokit} = require('./lib/octokit.js');
const checks = require('./lib/checks.js');
const secrets = require('./secrets.json');

function sign(data, secret) {
  const digest = createHmac('sha1', secret).update(data).digest('hex');
  return `sha1=${digest}`;
}

function jsonVerifier(header, secret, logger) {
  return express.json({
    verify: (req, res, buf) => {
      const actual = req.get(header);
      if (typeof actual !== 'string') {
        throw new Error(`no ${header} header`);
      }
      const expected = sign(buf, secret);
      if (actual !== expected) {
        logger.error({actual, expected}, 'signature mismatch');
        throw new Error('signature mismatch');
      }
    },
  });
}

function getOctokitFor(payload) {
  return getOctokit({
    appId: secrets.github.app_id,
    privateKey: secrets.github.private_key,
    installationId: payload.installation.id,
  });
}

function createExpressApp(logger) {
  const app = express();

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.use('/api/webhook', jsonVerifier('x-hub-signature',
      secrets.github.webhook_secret, logger));
  app.post('/api/webhook', (req, res, next) => {
    const event = req.get('x-github-event');
    const delivery = req.get('x-github-delivery');
    const payload = req.body;
    logger.info({event, delivery, payload}, 'webhook received');

    switch (event) {
      case 'check_run': {
        if (payload.action === 'rerequested') {
          logger.warn('restarting check run not implemented');
        } else if (payload.action === 'requested_action') {
          logger.warn('handling user actions not implemented');
        }
        res.end();
        break;
      }
      case 'check_suite': {
        if (payload.action !== 'requested' &&
            payload.action !== 'rerequested') {
          return;
        }

        const data = {
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          head_branch: payload.check_suite.head_branch,
          head_sha: payload.check_suite.head_sha,
        };

        // Do the work async.
        logger.info({data}, 'scheduling check creation');
        setTimeout(() => {
          const octokit = getOctokitFor(payload);
          checks.create(octokit, data, logger);
        });
        res.end();
        break;
      }
      case 'commit_comment':
      case 'issue_comment':
      case 'pull_request_review_comment': {
        if (payload.action !== 'created' && payload.action !== 'edited') {
          return;
        }

        // To avoid a comment loop in the event of a mishap, do not react to any
        // bot comments, importantly including our own ones.
        if (payload.comment.user.type === 'Bot') {
          const name = payload.comment.user.login;
          logger.info(`ignoring bot comment from ${name}`);
          return;
        }

        // Do nothing if this is not directed at @spec-test-bot.
        // TODO: Avoid reacting to '@spec-test-botanist'
        const atMentioned = payload.comment.body.includes('@spec-test-bot');
        if (!atMentioned) {
          return;
        }

        if (event !== 'issue_comment') {
          logger.warn('comment reactions not implemented');
          return;
        }

        const octokit = getOctokitFor(payload);

        octokit.reactions.createForIssueComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          comment_id: payload.comment.id,
          content: '+1',
        }).then(() => {
          res.end();
        }, next);
        break;
      }
      default:
        logger.info(`$${event} webhook event ignored`);
        res.end();
        break;
    }
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
