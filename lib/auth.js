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
