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

const octokit = require('@octokit/rest')();
const auth = require('./auth.js');

const debug = require('debug')('wpt-check:checks');

async function create(data) {
  const token = await auth.getToken(data);
  debug(token);

  octokit.authenticate({
    type: 'token',
    token: token,
  });

  // set to in progress immediately
  // eslint-disable-next-line camelcase
  const run_data = {
    owner: data.owner,
    repo: data.repo,
    head_branch: data.head_branch,
    head_sha: data.head_sha,
    name: 'Test check',
    status: 'in_progress',
    started_at: new Date().toISOString(),
    details_url: 'https://app.foolip.org/stuff',
  };

  debug('creating a run:\n', run_data);
  const result = await octokit.checks.create(run_data);

  run_data.check_run_id = result.data.id;
  debug('created run:\n', run_data);

  // after 15s, finish the run
  setTimeout(async () => {
    run_data.conclusion = 'action_required';
    run_data.completed_at = new Date().toISOString();
    run_data.output = {
      title: 'Another check title',
      summary: 'Does markdown *work*?',
      text: 'More words\nAnd lines\n[links work](https://example.com)',
    };
    run_data.actions = [{
      label: 'Ignore this',
      description: 'More words',
      identifier: 'TODO',
    }];
    debug('updating run:\n', run_data);

    const result = await octokit.checks.update(run_data);
    debug('check run concluded:\n', result);
  }, 15000);
}

module.exports = {
  create: create,
};
