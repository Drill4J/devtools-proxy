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
/* eslint-disable max-classes-per-file */
import CDP from 'chrome-remote-interface';
import axios from 'axios';
import { getLogger, Logger } from '../util/logger';

type Subscription = {
  handler: (params: unknown) => void;
  data: unknown[];
};

export class CdpClient {
  private connection: CDP.Client;

  private subscriptions: Record<string, Subscription> = {};

  private eventsData: Record<string, any> = {};

  public ready: Promise<CdpClient>;

  public options: CDP.Options;

  private logger: Logger;

  constructor(options: CDP.Options) {
    this.options = options;
    this.ready = this.init(options);
    const { target } = options;
    this.logger = getLogger('client', target as string);
  }

  private async init(options: CDP.Options) {
    this.connection = await CDP(options);
    this.logger.info('connected');

    this.connection.on('disconnect', (...args) => {
      this.logger.info('disconnected');
    });

    this.connection.on('event', this.handleEvent.bind(this));

    return this;
  }

  async disconnect(): Promise<void> {
    await this.connection.close();
  }

  async executeCommand(
    domainName: string,
    commandName: string,
    options: { sessionId?: string; params: Record<string, any> },
  ): Promise<unknown> {
    const { sessionId, params } = options;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.connection.send(`${domainName}.${commandName}`, params, sessionId);
  }

  // https://chromedevtools.github.io/devtools-protocol/#endpoints
  async sendHttpGet(path: string): Promise<unknown> {
    const { host, port, secure } = this.options;
    const stripLeadingSlash = (str: string) => str.replace(/^\//, '');
    const url = `${secure ? 'https' : 'http'}://${host}:${port}/${stripLeadingSlash(path)}`;
    const response = await axios.get(url);
    return response.data;
  }

  private handleEvent(message: CDP.EventMessage) {
    const { method, params, sessionId } = message;
    this.logger.debug(`event ${method} ${sessionId || ''}`);

    const key = this.getEventKey(method, sessionId);
    if (!Array.isArray(this.eventsData[key])) {
      this.eventsData[key] = [];
    }

    this.eventsData[key].push(params);
  }

  getEventData(domain: string, event: string, sessionId?: string): unknown[] {
    // domain + '.' + event = method (in CDP terms)
    const key = this.getEventKey(`${domain}.${event}`, sessionId);
    // FIXME clear this.eventsData[key] to avoid OOM ???
    return this.eventsData[key] || [];
  }

  private getEventKey(method, sessionId) {
    return `${method} ${sessionId || ''}`;
  }
}

export class CdpHub {
  private clients: Record<string, CdpClient> = {};

  async addClient(options: CDP.Options): Promise<void> {
    this.clients[options.target as string] = await new CdpClient(options).ready;
  }

  async removeClient(options: CDP.Options): Promise<void> {
    await this.clients[options.target as string].disconnect();
  }

  listClients(): CDP.Options[] {
    return Object.values(this.clients).map(client => client.options);
  }

  getClient(target: string): CdpClient {
    const client = this.clients[target];
    if (!client) throw new Error(`No connection to target ${target}"`);
    return client;
  }
}

const hub = new CdpHub();
export default hub;
