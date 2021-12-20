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
import { Next, ExtendableContext } from 'koa';
import { IRouterParamContext } from 'koa-router';
import { CdpHub } from 'cdp';

export const addCdpClientToCtx =
  (cdpHub: CdpHub) =>
  async (ctx: ExtendableContext & IRouterParamContext, next: Next): Promise<any> => {
    const { host, port, target, ...params } = ctx.request.body;
    if (!ctx.state) ctx.state = {};
    ctx.state.cdpClient = cdpHub.getClient(host, port, target);
    ctx.request.body = params;
    return next();
  };
