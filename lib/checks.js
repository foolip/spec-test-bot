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

const logger = require('./logger.js');

async function create(octokit, data) {
  // set to in progress immediately
  const options = {
    owner: data.owner,
    repo: data.repo,
    head_branch: data.head_branch,
    head_sha: data.head_sha,
    name: 'Test check',
    status: 'in_progress',
    started_at: new Date().toISOString(),
    details_url: `https://spec-test-bot.appspot.com/${data.owner}/${data.repo}/${data.head_sha}`,
  };

  logger.debug({options}, 'creating a run');
  const createResult = await octokit.checks.create(options);
  logger.debug({result: createResult}, 'created run');

  options.check_run_id = createResult.data.id;

  // artificially wait for 15 seconds
  await new Promise((resolve) => setTimeout(resolve, 15000));

  options.conclusion = 'action_required';
  options.completed_at = new Date().toISOString();
  options.output = {
    title: 'Another check title',
    summary: 'Does markdown *work*?',
    text: 'More words\nAnd lines\n[links work](https://example.com)',
  };
  options.actions = [{
    label: 'Ignore this',
    description: 'More words',
    identifier: 'TODO',
  }];
  logger.debug({options}, 'updating run');

  const updateResult = await octokit.checks.update(options);
  logger.debug({result: updateResult}, 'check run concluded');
}

module.exports = {
  create: create,
};
