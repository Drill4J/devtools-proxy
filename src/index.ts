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
import { Server } from 'http';
import * as httpServer from './http-server';

let server: Server;
!process.env.DO_NOT_LAUNCH_HTTP_SERVER_ON_STARTUP && init();
export async function init(): Promise<void> {
  server = await httpServer.start();
}

export async function stop(): Promise<void> {
  // TODO this looks naive, shouldn't we wait for requests to complete first >_>
  return new Promise((resolve, reject) =>
    server.close(err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    }),
  );
}
