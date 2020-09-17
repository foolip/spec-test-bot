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

const express = require('express');
const checks = require('./lib/checks.js');
const logger = require('./lib/logger');

const app = express();
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    const secret = process.env.APP_WEBHOOK_SECRET;
    if (!secret) {
      return;
    }
    const signature = req.header('x-hub-signature');
    logger.debug(`TODO: verify signature ${signature}`);
    if (signature != 'sha1=30816a3aa38e10f66819a3c84868db9cc87cd2a2') {
      throw new Error(`Signature mismatch`);
    }
  },
}));

app.get('/', (req, res) => {
  logger.debug('GET /');
  res.send('Hello World!');
});

app.get('/callback', (req, res) => {
  res.send('TODO');
});

app.post('/webhook', (req, res) => {
  logger.debug('/webhook invoked');

  const deliveryId = req.header('x-github-delivery');
  logger.debug(`X-GitHub-Delivery: ${deliveryId}`);
  const event = req.header('x-github-event');

  const payload = req.body;

  if (event == 'check_run') {
    logger.debug('ignoring check_run event');
    res.end();
    return;
  }

  if (event !== 'check_suite') {
    throw new Error(`Unexpected event: ${event}`);
  }

  logger.debug(`check_suite action: ${payload.action}`);
  if (payload.action != 'requested') {
    res.end();
    return;
  }

  const data = {
    app_id: payload.check_suite.app.id,
    installation_id: payload.installation.id,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    head_branch: payload.check_suite.head_branch,
    head_sha: payload.check_suite.head_sha,
  };
  logger.debug('/webhook check_suite extracted data:', data);
  res.end();

  // Do the work later.
  setTimeout(() => checks.create(data));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});
