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

const bunyan = require('bunyan');
const {LoggingBunyan} = require('@google-cloud/logging-bunyan');

const streams = [];
/* istanbul ignore next */
if (process.env.NODE_ENV === 'production') {
  // In production, use @google-cloud/logging-bunyan.
  const loggingBunyan = new LoggingBunyan();
  streams.push(loggingBunyan.stream('debug'));
} else if (process.env.NODE_ENV === 'test') {
  // In testing, make the logging silent. (no streams)
} else {
  // Locally, log to stdout. Pipe through bunyan for nicer output.
  streams.push({stream: process.stdout, level: 'debug'});
}

const logger = bunyan.createLogger({name: 'spec-test-bot', streams});

module.exports = logger;
