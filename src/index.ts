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
import CDP, { Command, Protocol, Parameter } from 'chrome-remote-interface';
import axios from 'axios';
import Router, { IRouterParamContext } from 'koa-router';
import { ExtendableContext } from 'koa';
import * as httpServer from './http-server';
import devToolsProtocol from './cdp/dev-tools-protocol';
import cdpHub, { getDevtoolsVersionJson, resolveDebuggerUrl } from './cdp';
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

  // See https://chromedevtools.github.io/devtools-protocol/#get-jsonversion
  router.post('/get-devtools-version-json', async (ctx: ExtendableContext & IRouterParamContext) => {
    const { host, port, secure = false, useHostName }: CDP.BaseOptions = ctx.request.body;
    if (!host || !port)
      throw new Error(
        "Specify host and port of DevTools API in request's body.\n" +
          'Optional:\n' +
          '-pass "secure": true to connect with https\n' +
          '-pass "useHostName": true to bypass dns lookup',
      );

    // eslint-disable-next-line max-len
    // See https://github.com/DefinitelyTyped/DefinitelyTyped/blob/a1260a1f3d40f239b53fd29effba594b0d1bee08/types/chrome-remote-interface/index.d.ts#L12
    const versionJson = await getDevtoolsVersionJson({ host, port, secure, useHostName });
    ctx.ok(versionJson);
  });

  router.post('/resolve-debugger-url', async (ctx: ExtendableContext & IRouterParamContext) => {
    const { webSocketDebuggerUrl } = ctx.request.body;
    if (!webSocketDebuggerUrl) throw new Error("Specify webSocketDebuggerUrl in request's body");

    const resolvedUrl = await resolveDebuggerUrl(webSocketDebuggerUrl);
    ctx.ok({ webSocketDebuggerUrl: resolvedUrl });
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
  clientRouter.post('/intercept', async (ctx: ExtendableContext & IRouterParamContext) => {
    await ctx.state.cdpClient.intercept(ctx.request.body);
    ctx.ok();
  });
  clientRouter.delete('/intercept', async (ctx: ExtendableContext & IRouterParamContext) => {
    await ctx.state.cdpClient.stopIntercepting(ctx.request.body);
    ctx.ok();
  });
  clientRouter.get('/event/:domain.:event', async (ctx: ExtendableContext & IRouterParamContext) => {
    const data = ctx.state.cdpClient.getEventData(ctx.params.domain, ctx.params.event, ctx.request.body?.sessionId);
    ctx.ok(data);
  });
  router.use(clientRouter.routes());
  return router.routes();
}
