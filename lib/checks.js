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
    name: 'Look for WPT test',
    status: 'in_progress',
    started_at: new Date().toISOString(),
    details_url: `https://spec-test-bot.appspot.com/checks/${data.owner}/${data.repo}/${data.head_sha}`,
  };

  logger.debug({options}, 'creating a run');
  const createResult = await octokit.checks.create(options);
  logger.debug({result: createResult}, 'created run');

  options.check_run_id = createResult.data.id;

  const commit = await octokit.rest.git.getCommit({owner:data.owner, repo:data.repo, commit_sha: data.head_sha});
  const commitMessage = commit.data.message;

  const hasWpt = /https:\/\/wpt\.fyi/.test(commitMessage);

  if(hasWpt) {
    const wptUrl = /https:\/\/wpt\.fyi\S*/.exec(commitMessage)[0];
    options.conclusion = "success";
    options.completed_at = new Date().toISOString();
    options.output = {
      title: "Linked to WPT test",
      summary: `Linked to ${wptUrl}`,
      text: `Successfully linked this commit with ${wptUrl}.\n\nIf this is incorrect, oh well.`
    }
  } else {
    options.conclusion = "failure";
    options.completed_at = new Date().toISOString();
    options.output = {
      title: "Failed to link to WPT test",
      summary: "No WPT URL in the commit message.",
      text: "No WPT url was found in the commit message.\n\nTo link this commit to a WPT url, wait for us to add that function."
    }
  }
/*
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
*/
  logger.debug({options}, 'updating run');

  const updateResult = await octokit.checks.update(options);
  logger.debug({result: updateResult}, 'check run concluded');
}

module.exports = {
  create: create,
};
