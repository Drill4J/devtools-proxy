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
import { Command, Domain, Protocol, Parameter } from 'chrome-remote-interface';
import Router from 'koa-router';
import * as httpServer from './http-server';
import devToolsProtocol from './lib/dev-tools-protocol';
import cdp from './lib/cdp';
import { camelOrPascalToKebabCase } from './lib';

function main() {
  addDevToolsRoutes(devToolsProtocol)(httpServer.getRouter());

  httpServer.registerRoutes();
  httpServer.start();
}

const addDevToolsRoutes = (protocol: Protocol) => (router: Router) => {
  const routes = convertDevToolsProtocolToHttpRoutes(protocol);

  const routesMap = routes.reduce((a, x) => {
    // eslint-disable-next-line no-param-reassign
    a[x.path] = x.meta;
    return a;
  }, {});

  /*
    POST http://cdp-http-proxy/sessions
    {
      host: localhost
      port: 9222
    }
    sessionId + CDP client established connection
  */
  router.post('/sessions', async ctx => {
    return cdp.initConnection(ctx.request.body);
  });

  /*
    // https://chromedevtools.github.io/devtools-protocol/
    POST http://cdp-http-proxy/sessions/:sessionId/:domain/:command
    {
      foo: bar
    }
  */
  routes.forEach(x =>
    router.post(`/sessions/:sessionId/${x.path}`, async ctx => {
      const { sessionId } = ctx.params;
      const { domain, command } = routesMap[x.path].original;
      // TODO validate agains protocol schema
      const params = ctx.request.body;
      return cdp.sendCommand(sessionId, domain, command, params);
    }),
  );
};

// NOTE: had to patch out "type?" property to "string" instead of TypeEnum
// for TypeElement, Parameter and Items property
// was: type?: TypeEnum | undefined;`
// now: type?: string;
// TODO: figure out how to cast it properly?
const convertDevToolsProtocolToHttpRoutes = (protocol: Protocol) => {
  return protocol.domains.map(domain => domain.commands.map(commandToRoute(domain.domain))).flat();
};

export type CDPRouteMetadata = {
  original: {
    domain: any;
    command: string;
  };
  name: string;
  description?: string;
  experimental?: boolean;
  parameters?: Parameter[];
  returns?: Parameter[];
  redirect?: string;
  deprecated?: boolean;
};

const commandToRoute =
  domainName =>
  (command: Command): { path: string; meta: CDPRouteMetadata } => {
    const commandName = camelOrPascalToKebabCase(command.name);
    const result = {
      path: `${camelOrPascalToKebabCase(domainName)}/${commandName}`,
      meta: {
        ...command,
        original: {
          domain: domainName,
          command: command.name,
        },
      },
    };

    if (Array.isArray(command.parameters)) {
      result.meta.parameters = command.parameters?.map(x => {
        if (x.$ref) {
          return {
            ...x,
            type: lookupRefType(domainName, x.$ref) as any, // TS is giving me trouble, no time to fix it :(
          };
        }
        return x;
      });
    }
    return result;
  };

const lookupRefType = (parentDomain, typeString: string) => {
  let [domain, type] = typeString.split('.');

  // TODO rewrite to check for absence of "." (no dot -> no domain -> this is a type in current domain)
  if (!type) {
    type = domain;
    domain = parentDomain;
  }

  return devToolsProtocol.domains.find(x => x.domain === domain).types.find(x => x.type === type);
};

main();
