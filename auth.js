const octokit = require('@octokit/rest')();
const jwt = require('jsonwebtoken');

// getToken() does two things:
// https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app
// https://developer.github.com/v3/apps/#create-a-new-installation-token
//
// TODO: "Installation tokens expire one hour from the time you create them."
async function getToken() {
    const cert = process.env.APP_PRIVATE_KEY;
    const appId = process.env.APP_ID;

    const appToken = jwt.sign({}, cert, {
	algorithm: 'RS256',
	expiresIn: 600,
	issuer: appId,
    });

    octokit.authenticate({
	type: 'app',
	token: appToken,
    });

    const result = await octokit.apps.createInstallationToken({installation_id: 255453});
    //console.log(result);
    return result.data.token
}

async function main() {
    const token = await getToken();

    octokit.authenticate({
	type: 'token',
	token: token,
    });

    const result = await octokit.checks.create({
	owner: 'foolip',
	repo: 'web-platform-tests',
	name: 'Test check',
	head_branch: 'test-branch',
	head_sha: 'ea3335dc1719ab30eab8f8bbd6d40da48a5e9a1e',
	details_url: 'https://app.foolip.org/stuff',
	conclusion: 'neutral',
	completed_at: new Date().toISOString(),
	output: {
	    title: 'Another check title',
	    summary: 'Does markdown *work*?',
	    text: 'More words\nAnd lines\n[links work](https://example.com)',
	},
	actions: [{
	    label: 'Ignore this',
	    description: 'More words',
	    identifier: 'TODO',
	}],
    });

    console.log(result);
}

main();
