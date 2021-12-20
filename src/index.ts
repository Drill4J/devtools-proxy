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
import { Command, Protocol, Parameter } from 'chrome-remote-interface';
import axios from 'axios';
import Router, { IRouterParamContext } from 'koa-router';
import { ExtendableContext } from 'koa';
import * as httpServer from './http-server';
import devToolsProtocol from './cdp/dev-tools-protocol';
import cdpHub from './cdp';
import { addCdpClientToCtx } from './cdp/middleware/add-cdp-client-to-ctx';
import { bodyHasCdpOptions } from './cdp/middleware/body-has-cdp-options';

function main() {
  const rootRouter = httpServer.getRouter();

  rootRouter.use(createDevtoolsRoutes(devToolsProtocol));

  httpServer.registerRoutes('V8 DevTools Proxy');
  httpServer.start();
}
main();

function createDevtoolsRoutes(protocol: Protocol): Router.IMiddleware {
  const router = new Router();

  // See https://chromedevtools.github.io/devtools-protocol/#endpoints
  router.post('/request-http-endpoint', async (ctx: ExtendableContext & IRouterParamContext) => {
    const { host, port, path, secure } = ctx.request.body;
    if (!host || !port || !path) throw new Error('Request body must contain "host", "port", and "path"');
    const stripLeadingSlash = (str: string) => str.replace(/^\//, '');
    const url = `${secure ? 'https' : 'http'}://${host}:${port}/${stripLeadingSlash(path)}`;
    const response = await axios.get(url);
    ctx.ok(response.data);
  });

  router.get('/connections', async (ctx: ExtendableContext & IRouterParamContext) => {
    ctx.ok(cdpHub.listClients());
  });

  router.post('/connection', bodyHasCdpOptions, async (ctx: ExtendableContext & IRouterParamContext) => {
    await cdpHub.addClient(ctx.request.body);
    ctx.ok();
  });
  router.delete('/connection', bodyHasCdpOptions, async (ctx: ExtendableContext & IRouterParamContext) => {
    await cdpHub.removeClient(ctx.request.body);
    ctx.ok();
  });

  const clientRouter = new Router();

  clientRouter.use(bodyHasCdpOptions).use(addCdpClientToCtx(cdpHub));
  // execute command
  clientRouter.post('/command/:domain.:command', async (ctx: ExtendableContext & IRouterParamContext) => {
    const data = await ctx.state.cdpClient.executeCommand(ctx.params.domain, ctx.params.command, ctx.request.body);
    ctx.ok(data);
  });
  // sub/get/data/unsub from event
  clientRouter.post('/subscription/:domain.:event', async (ctx: ExtendableContext & IRouterParamContext) => {
    ctx.state.cdpClient.subscribeToEvent(ctx.params.domain, ctx.params.event);
    ctx.ok();
  });
  clientRouter.get('/subscription/:domain.:event', async (ctx: ExtendableContext & IRouterParamContext) => {
    const data = ctx.state.cdpClient.getEventData(ctx.params.domain, ctx.params.event);
    ctx.ok(data);
  });
  clientRouter.delete('/subscription/:domain.:event', async (ctx: ExtendableContext & IRouterParamContext) => {
    ctx.state.cdpClient.unsubscribeFromEvent(ctx.params.domain, ctx.params.event);
    ctx.ok();
  });

  router.use(clientRouter.routes());

  // TODO map & "document" available target methods?
  // const routes = convertDevToolsProtocolToHttpRoutes(protocol);
  // const routesMap = routes.reduce((a, x) => {
  //   // eslint-disable-next-line no-param-reassign
  //   a[x.path] = x.meta;
  //   return a;
  // }, {});
  // routes.forEach(x =>
  //   router.post(`/${x.path}`, async ctx => {
  //     const { domain, command } = routesMap[x.path].original;
  //     const { host, port, ...params } = ctx.request.body; // TODO validate against protocol schema
  //     return cdp.sendCommand(host, port, domain, command, params);
  //   }),
  // );

  return router.routes();
}

// NOTE: had to patch out "type?" property to "string" instead of TypeEnum
// for TypeElement, Parameter and Items property
// was: type?: TypeEnum | undefined;`
// now: type?: string;
// TODO: figure out how to cast it properly?
const convertDevToolsProtocolToHttpRoutes = (protocol: Protocol) => {
  return protocol.domains.map(domain => domain.commands.map(commandToRoute(domain.domain))).flat();
};

type CDPRouteMetadata = {
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
    const result = {
      path: `${domainName}.${command.name}`,
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
