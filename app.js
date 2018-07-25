const express = require('express');
const checks = require('./lib/checks.js');

const debug = require('debug')('wpt-check:app')

const app = express();
app.use(express.json({
    verify: (req, res, buf, encoding) => {
	const secret = process.env.APP_WEBHOOK_SECRET;
	if (!secret)
	    return;
	const signature = req.header('x-hub-signature')
	debug(`TODO: verify signature ${signature}`);
	if (signature != 'sha1=30816a3aa38e10f66819a3c84868db9cc87cd2a2')
	    throw new Error(`Signature mismatch`);
    }
}));

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/callback', (req, res) => {
    res.send('TODO');
});

app.post('/webhook', (req, res) => {
    debug('/webhook invoked');

    const deliveryId = req.header('x-github-delivery');
    debug(`X-GitHub-Delivery: ${deliveryId}`);
    const event = req.header('x-github-event');

    const payload = req.body;

    if (event == 'check_run') {
	debug('ignoring check_run event');
	res.end();
	return;
    }

    if (event !== 'check_suite')
	throw new Error(`Unexpected event: ${event}`);

    debug(`check_suite action: ${payload.action}`);
    if (payload.action != "requested") {
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
    debug('/webhook check_suite extracted data:', data);
    res.end();

    // Do the work later.
    setTimeout(() => checks.create(data));
});

const port = process.env.APP_PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}`));
