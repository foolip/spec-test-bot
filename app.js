const express = require('express');
const PORT = 8080;

const app = express();
app.use(express.json({
    verify: (req, res, buf, encoding) => {
	const signature = req.header('x-hub-signature')
	console.log(`TODO: verify signature ${signature}`)
	if (signature != 'sha1=30816a3aa38e10f66819a3c84868db9cc87cd2a2')
	    throw new Error(`Signature mismatch`);
    }
}));

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/callback', (req, res) => {
    res.send('callback handler');
    console.log(req.body);
});

app.post('/webhook', (req, res) => {
    const deliveryId = req.header('x-github-delivery');
    console.log(`X-GitHub-Delivery: ${deliveryId}`);
    const event = req.header('x-github-event');
    if (event !== 'check_suite')
	throw new Error(`Unsupported event: ${event}`);
    res.send('OK');
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
