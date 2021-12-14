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

export default {
  create,
  destroy,
  sendCommand,
  subscribe,
  unsubscribe,
  getEventData: getSubData,
  list: (): string[] => Object.keys(clients),
};

type Client = {
  id: string;
  connection: CDP.Client;
  subscriptions: Record<string, Subscription>;
};

type Subscription = {
  handler: (params: unknown) => void;
  data: unknown[];
};

const clients: Record<string, Client> = {};

async function create(options: CDP.Options): Promise<void> {
  const { host, port } = options;
  const id = getClientId(host, port);
  clients[id] = { id, connection: await CDP(options), subscriptions: {} };
}

async function destroy(host: string, port: string): Promise<void> {
  await getClient(host, port).connection.close();
  const id = getClientId(host, port);
  delete clients[id];
}

async function sendCommand(
  host: string,
  port: string | number,
  domainName: string,
  commandName: string,
  params: unknown,
): Promise<unknown> {
  const CDP = getClient(host, port);

  const domain = CDP.connection[domainName];
  if (!domain) throw new Error(`Domain ${domainName} does not exist`);

  const command = domain[commandName];
  if (!command) throw new Error(`Command ${commandName} does not exist in ${domainName} domain`);

  return command(params);
}

// EVENTS
function subscribe(host: string, port: string, domain: string, event: string): void {
  const client = getClient(host, port);
  const name = `${domain}.${event}`;

  const handler = data => {
    if (!client.subscriptions[name]) {
      client.subscriptions[name] = {
        handler,
        data: [],
      };
    }
    client.subscriptions[name].data.push(data);
  };

  client.connection.on(name, handler);
}

function getSubData(host: string, port: string, domain: string, event: string): unknown[] {
  const client = getClient(host, port);
  return client.subscriptions[getCdpEventName(domain, event)].data;
}

function unsubscribe(host: string, port: string, domain: string, event: string): void {
  const client = getClient(host, port);
  const name = getCdpEventName(domain, event);
  delete client.subscriptions[name].data;
  try {
    (client.connection as any).off(name, client.subscriptions[name].handler);
  } catch (e) {
    console.log(e);
  }
}

// UTIL

function getCdpEventName(domain, event) {
  return `${domain}.${event}`;
}

function getClient(host: string, port: string | number): Client {
  const id = getClientId(host, port);
  const client = clients[id];
  if (!client) throw new Error(`No connection for ${id}`);
  return client;
}

function getClientId(host: string, port: string | number) {
  return `${host}:${port}`;
}
