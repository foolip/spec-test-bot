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
const tasks = require('./tasks.js');

// Returns a promise, which if resolved means that the webhook was processed,
// and if rejected will result in the webhook response being an error.
const handler = async (event, payload) => {
  switch (event) {
    case 'check_run': {
      if (payload.action === 'rerequested') {
        logger.warn('restarting check run not implemented');
      } else if (payload.action === 'requested_action') {
        logger.warn('handling user actions not implemented');
      }
      return;
    }
    case 'check_suite': {
      if (payload.action !== 'requested' &&
          payload.action !== 'rerequested') {
        return;
      }

      // Create a task to do the actual work.
      await tasks.create('create_check', {
        installation_id: payload.installation.id,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        head_branch: payload.check_suite.head_branch,
        head_sha: payload.check_suite.head_sha,
      });
      return;
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

      // Create a task to do the actual work.
      await tasks.create('react_to_comment', {
        installation_id: payload.installation.id,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        comment_id: payload.comment.id,
      });
      return;
    }
    default:
      logger.info(`${event} webhook event ignored`);
      return;
  }
};

module.exports = handler;
