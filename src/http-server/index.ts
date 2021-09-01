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
import { Server } from 'http';
import Koa, { ExtendableContext, Next } from 'koa';
import Router, { IRouterParamContext } from 'koa-router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';

import getLogger from 'util/logger';
import createResponseHandler from './middleware/response.handler';
import createLoggerMiddleware from './middleware/logger';

const { PORT = 80, NODE_ENV, HTTP_SERVER_BODY_JSON_LIMIT = '500mb', HTTP_SERVER_BODY_FORM_LIMIT = '500mb' } = process.env;

const logger = getLogger('example', 'http-server');
const app = new Koa();
app.use(
  bodyParser({
    jsonLimit: HTTP_SERVER_BODY_JSON_LIMIT,
    formLimit: HTTP_SERVER_BODY_FORM_LIMIT,
  }),
);
app.use(cors());
app.use(createLoggerMiddleware(logger));
app.use(createResponseHandler(logger)); // router.use(createResponseHandler(logger));

const router = new Router();
router.get('/', () => ({ message: 'node-typescript-boilerplate API' }));

router.get('/route-param-example/:id', async (ctx: ExtendableContext & IRouterParamContext) => {
  return `You've requested ${ctx.params.id}`;
});

router.get(
  '/middleware-chain-example',
  async (ctx: ExtendableContext & IRouterParamContext, next: Next) => {
    ctx.foo = 'info added to ctx';
    return next();
  },
  async (ctx: ExtendableContext & IRouterParamContext) => {
    return `${ctx.foo} info added by handler`;
  },
);

app.use(router.routes());

export async function start(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      logger.info(`running at http://localhost:${PORT} in ${NODE_ENV || 'dev'} mode\npress CTRL-C to stop`);
      resolve(server);
    });
    setTimeout(() => reject(new Error(`bind timeout`)), 10000);
  });
}
