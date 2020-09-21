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

const {CloudTasksClient} = require('@google-cloud/tasks');

const secrets = require('../secrets.json');

const {getOctokit} = require('./octokit.js');
const checks = require('./checks.js');
const logger = require('./logger.js');
const signedJson = require('./signed-json.js');

const project = process.env.GOOGLE_CLOUD_PROJECT;
const queue = process.env.CHECKS_QUEUE_NAME;
const location = process.env.CHECKS_QUEUE_REGION;

async function create(name, parameters) {
  const client = new CloudTasksClient();
  const parent = client.queuePath(project, location, queue);

  const payload = {name, parameters};
  const body = Buffer.from(JSON.stringify(payload));
  const signature = signedJson.sign(body, secrets.project_secret);

  const task = {
    appEngineHttpRequest: {
      httpMethod: 'POST',
      relativeUri: '/api/task',
      body,
      headers: {
        'content-type': 'application/json',
        'x-self-signature': signature,
      },
      // By default, tasks are routed to the default service and version.
      // Instead route them to ourself.
      appEngineRouting: {
        service: process.env.GAE_SERVICE,
        version: process.env.GAE_VERSION,
      },
    },
  };

  logger.info({task}, 'creating task');
  const [response] = await client.createTask({parent, task});
  logger.info({response}, 'task created');
}

async function run(name, parameters) {
  logger.debug({name, parameters}, 'so far so good');

  const octokit = getOctokit({
    appId: secrets.github.app_id,
    privateKey: secrets.github.private_key,
    installationId: parameters.installation_id,
  });

  switch (name) {
    case 'create_check':
      await checks.create(octokit, parameters);
      return;
    case 'react_to_comment':
      await octokit.reactions.createForIssueComment({
        owner: parameters.owner,
        repo: parameters.repo,
        comment_id: parameters.comment_id,
        content: '+1',
      });
      return;
  }

  logger.warn(`Unexpected task name: ${name}`);
}

module.exports = {create, run};
