/*
 * Copyright 2020 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import axios from 'axios';
import * as env from '../env'; // make sure to place env import PRIOR to any code relied on env vars
import * as Main from '../../src';

beforeEach(async () => {
  env.reset();
  await Main.init();
});

afterEach(async () => {
  await Main.stop();
});

describe('HTTP server', () => {
  describe('request must succeed', () => {
    ['/', '/route-param-example/12345', '/middleware-chain-example'].forEach(path =>
      it(`${path}`, async () => {
        await expect(axios.get(`http://localhost:${env.get().PORT}${path}`)).resolves.not.toThrow();
      }),
    );
  });
});
