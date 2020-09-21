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

const chai = require('chai');
const {assert} = chai;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const proxyquire = require('proxyquire');

const app = proxyquire('../app.js', {
  './secrets.json': {
    github: {
      webhook_secret: 'mock_secret',
    },
  },
});

const agent = chai.request.agent(app);

suite('express app', () => {
  test('front page', async () => {
    const res = await agent.get('/');
    assert.equal(res.status, 200);
    assert.include(res.text, 'Hello World');
  });

  suite('webhook', () => {
    // These webhook signature test are not done as unit tests, as it is very
    // important that it works when integrated into the app, and it is possible
    // to cover it well from the app layer as well.

    const body = JSON.stringify({});

    test('with signature', async () => {
      const {createHmac} = require('crypto');
      const digest = createHmac('sha1', 'mock_secret')
          .update(body).digest('hex');
      const signature = `sha1=${digest}`;

      const res = await agent.post('/api/webhook')
          .set('x-github-event', 'dummy')
          .set('x-hub-signature', signature)
          .set('content-type', 'application/json')
          .send(body);
      assert.equal(res.status, 200);
    });

    test('with wrong signature', async () => {
      const res = await agent.post('/api/webhook')
          .set('x-github-event', 'dummy')
          .set('x-hub-signature', 'sha1=wrong')
          .set('content-type', 'application/json')
          .send(body);
      assert.equal(res.status, 403);
      assert.include(res.text, 'signature mismatch');
    });

    test('with no signature', async () => {
      const res = await agent.post('/api/webhook')
          .set('x-github-event', 'dummy')
          .set('content-type', 'application/json')
          .send(body);
      assert.equal(res.status, 403);
      assert.include(res.text, 'no x-hub-signature header');
    });
  });
});

suiteTeardown(() => agent.close());
