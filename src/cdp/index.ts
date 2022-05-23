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
import { URL } from 'url';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Protocol as DevtoolsProtocol } from 'devtools-protocol'; // not listed in package.json, dependency of chrome-remote-interface
// eslint-disable-next-line import/no-extraneous-dependencies
import ProtocolMapping from 'devtools-protocol/types/protocol-mapping';
import CDP from 'chrome-remote-interface';
import { getLogger, Logger } from '../util/logger';
import { timeout } from '../util/timeout';

type QueryParamsObject = Record<string, string>;
export class CdpClient {
  private connection: CDP.Client;

  private eventsData: Record<string, any> = {};

  public ready: Promise<CdpClient>;

  public options: CDP.Options;

  private logger: Logger;

  private requestInterceptor: (params: DevtoolsProtocol.Fetch.RequestPausedEvent) => Promise<void>;

  constructor(options: CDP.Options) {
    this.options = options;
    this.logger = getLogger('client', (options as any).target);
    this.ready = this.init(options);
  }

  private async init(options: CDP.Options) {
    // force chrome-remote-interface to load Chrome Devtools Protocol JSON schema from _local file_
    // Why:
    //  1. it's hard to obtain /json/protocol from various webdriver implementations (selenium standalone/selenoid/etc)
    //  2. it likely won't change too often anyway and _will_ break in obvious way
    //  3. once it happen we shoud be able to fix it with either
    //    - chrome-remote-interface version bump
    //    - or manuall protocol.json replacement
    // eslint-disable-next-line no-param-reassign
    options.local = true;

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
    this.eventsData = undefined;
  }

  async executeCommand(
    domainName: string,
    commandName: string,
    options: { sessionId?: string; params: Record<string, any> },
  ): Promise<unknown> {
    const { params, sessionId } = options;
    return Promise.race([
      timeout(Number(process.env.COMMAND_TIMEOUT_MS) || 15000),
      this.connection.send(`${domainName}.${commandName}` as keyof ProtocolMapping.Commands, params, sessionId),
    ]);
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
    const result = this.eventsData[key];
    if (!result) {
      return [];
    }
    this.eventsData[key] = [];
    return result;
  }

  private getEventKey(method, sessionId) {
    return `${method} ${sessionId || ''}`;
  }

  async stopIntercepting(options: { sessionId: string }) {
    const { sessionId } = options;
    if (this.requestInterceptor) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.connection.off(`Fetch.requestPaused.${sessionId}`, this.requestInterceptor);
    }
    await this.connection.send('Fetch.disable', undefined, sessionId);
  }

  async intercept(options: { sessionId: string; params: { query: QueryParamsObject } }): Promise<void> {
    const {
      sessionId,
      params: { query },
    } = options;

    if (this.requestInterceptor) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.connection.off(`Fetch.requestPaused.${sessionId}`, this.requestInterceptor);
    }

    this.requestInterceptor = async (params: DevtoolsProtocol.Fetch.RequestPausedEvent) => {
      const { request, requestId } = params;

      const { url, urlFragment } = request;

      const injectedUrl = inject(url, query); // FIXME do not inject drill params for cross-origin requests?
      await this.connection.send(
        'Fetch.continueRequest',
        {
          requestId,
          url: injectedUrl,
        },
        sessionId,
      );
    };

    this.connection.on(`Fetch.requestPaused.${sessionId}`, this.requestInterceptor);
    // FIXME url pattern?
    await this.connection.send('Fetch.enable', {}, sessionId); // FIXME handle auth this.connection.on('Fetch.authRequired', (params) => {})

    // functions
    const inject = (url: string, query: QueryParamsObject) => {
      const alreadyInjected = Object.keys(query).some(name => url.includes(encodeURIComponent(name))); // FIXME some vs every ?
      if (alreadyInjected) return url;

      const queryStr = Object.entries(query)
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&');

      return appendQueryParams(url, queryStr);
    };

    const appendQueryParams = (url: string, toAppend: string) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.search) {
        parsedUrl.search = `${parsedUrl.search}&${toAppend}`;
      } else {
        parsedUrl.search = `?${toAppend}`;
      }
      return parsedUrl.toString();
    };
  }
}

export class CdpHub {
  private clients: Record<string, CdpClient> = {};

  async addClient(options: CDP.Options): Promise<void> {
    this.clients[options.target as string] = await new CdpClient(options).ready;
  }

  async removeClient(options: CDP.Options): Promise<void> {
    await this.clients[options.target as string].disconnect();
    delete this.clients[options.target as string];
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
