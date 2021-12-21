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
import { ExtendableContext, Next } from 'koa';
import { IRouterParamContext } from 'koa-router';

export const bodyHasCdpOptions = async (ctx: ExtendableContext & IRouterParamContext, next: Next) => {
  const { target }: CDP.Options = ctx.request.body;

  if (!target) throw new Error(`Request body must contain the "target"`);
  return next();
};
