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
const jwt = require('jsonwebtoken');

const debug = require('debug')('wpt-check:auth');

// getToken() does two things:
// https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app
// https://developer.github.com/v3/apps/#create-a-new-installation-token
//
// TODO: Cache the token, but: "Installation tokens expire one hour
// from the time you create them."
async function getToken(data) {
  const cert = process.env.APP_PRIVATE_KEY;

  const appToken = jwt.sign({}, cert, {
    algorithm: 'RS256',
    expiresIn: 600,
    issuer: String(data.app_id),
  });

  octokit.authenticate({
    type: 'app',
    token: appToken,
  });

  const result = await octokit.apps.createInstallationToken({
    installation_id: data.installation_id,
  });
  debug('received token:\n', result.data);
  return result.data.token;
}

module.exports = {
  getToken: getToken,
};
