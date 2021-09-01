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
/* eslint-disable */
import debug from 'debug';
import chalk from 'chalk';

export interface Logger {
  [key: string]: (...args) => void;
}

const levels = {
  0: { name: 'error', decoration: chalk.whiteBright, nameDecoration: chalk.whiteBright.bgRedBright },
  1: { name: 'warning', decoration: chalk.whiteBright, nameDecoration: chalk.black.bgYellowBright },
  2: { name: 'info', decoration: chalk.white },
  3: { name: 'debug', decoration: chalk.blueBright },
  4: { name: 'silly', decoration: chalk.yellow },
};

export default function getLogger(prefix: string, name: string): Logger {
  const logFn = debug(`${prefix}:${name}`);
  const logger = {};
  Object.keys(levels).forEach(level => {
    const levelOpts = levels[level];
    logger[levelOpts.name] = createLogger(level, levelOpts, logFn);
  });
  return logger;
}

const createLogger = (level, levelOpts, printer) => {
  let log = printer;
  if (levelOpts.nameDecoration) {
    log = (...args) => printer(levelOpts.nameDecoration(`${(levelOpts.name as string).toUpperCase()}`), ...args);
  }

  const decorateArgs = getDecorator(levelOpts);

  return (...args) => {
    if (Number(level) > getLoggingLevel()) return;
    log(...args.map(decorateArgs));
  };
};

const getDecorator = levelOpts => arg => {
  const shouldNotDecorate = typeof arg === 'object';
  if (shouldNotDecorate) return arg;
  return levelOpts.decoration(arg);
};

const getLoggingLevel = () => {
  return (global as any).logLevel || parseInt(process.env.DEBUG_LOG_LEVEL, 10) || 1;
};
