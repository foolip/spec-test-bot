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

const secrets = require('./secrets.json');

const logger = require('./lib/logger.js');
const signedJson = require('./lib/signed-json.js');
const webhook = require('./lib/webhook.js');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.route('/api/webhook')
    .post(signedJson({
      header: 'x-hub-signature',
      secret: secrets.github.webhook_secret,
    }))
    .post((req, res, next) => {
      const event = req.get('x-github-event');
      const delivery = req.get('x-github-delivery');
      const payload = req.body;
      logger.info({event, delivery, payload}, 'webhook received');
      webhook(event, payload).then(() => res.end(), next);
    });

/* istanbul ignore if */
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
} else {
  // Export app for testing.
  module.exports = app;
}
