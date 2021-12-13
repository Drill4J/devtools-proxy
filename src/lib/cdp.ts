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
import CDP from 'chrome-remote-interface';
import { nanoid } from 'nanoid';

const clients = {};

function getClients(): string[] {
  return Object.keys(clients);
}

async function initConnection(
  options: CDP.Options = {
    host: 'localhost',
    port: 9222,
  },
): Promise<string> {
  const id = nanoid();
  clients[id] = await CDP(options);
  return id;
}

async function sendCommand(id: string, domainName: string, commandName: string, params: unknown): Promise<unknown> {
  try {
    const client = clients[id];
    const domain = client[domainName];
    const command = domain[commandName];
    return command(params);
  } catch (e) {
    await clients[id].close();
    throw new Error(`CDP sendCommand error: ${e.message}`);
  }
}

export default {
  initConnection,
  sendCommand,
  getClients,
};
