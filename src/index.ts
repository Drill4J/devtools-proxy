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

  router.post('/connection', bodyHasCdpOptions, async (ctx: ExtendableContext & IRouterParamContext) => {
    await cdpHub.addClient(ctx.request.body);
    ctx.ok();
  });
  router.get('/connections', async (ctx: ExtendableContext & IRouterParamContext) => {
    ctx.ok(cdpHub.listClients());
  });
  router.delete('/connection', bodyHasCdpOptions, async (ctx: ExtendableContext & IRouterParamContext) => {
    await cdpHub.removeClient(ctx.request.body);
    ctx.ok();
  });

  const clientRouter = new Router();
  clientRouter.use(bodyHasCdpOptions).use(addCdpClientToCtx(cdpHub));
  clientRouter.post('/command/:domain.:command', async (ctx: ExtendableContext & IRouterParamContext) => {
    const data = await ctx.state.cdpClient.executeCommand(ctx.params.domain, ctx.params.command, ctx.request.body);
    ctx.ok(data);
  });
  clientRouter.get('/event/:domain.:event', async (ctx: ExtendableContext & IRouterParamContext) => {
    const data = ctx.state.cdpClient.getEventData(ctx.params.domain, ctx.params.event, ctx.request.body?.sessionId);
    ctx.ok(data);
  });
  router.use(clientRouter.routes());
  return router.routes();
}
