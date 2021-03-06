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
import Koa from 'koa';
import { Logger } from '../../util/logger';

export default (logger: Logger) =>
  async (ctx: Koa.Context, next: Koa.Next): Promise<unknown> => {
    logger.info('request:', ctx.request.method, ctx.request.path);
    return next();
  };
