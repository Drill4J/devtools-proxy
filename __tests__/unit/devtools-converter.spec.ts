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
import { camelOrPascalToKebabCase } from '../../src/lib';

describe('Convert devtool Domains and Commands names to kebab-case', () => {
  [
    ['Database', 'database'],
    ['HeadlessExperimental', 'headless-experimental'],
    ['DOMDebugger', 'dom-debugger'],
    ['startPreciseCoverage', 'start-precise-coverage'],
    ['setDOMBreakpoint', 'set-dom-breakpoint'],
    ['setBreakOnCSPViolation', 'set-break-on-csp-violation'],
    ['executeSQL', 'execute-sql'],
    // these are made up, just in case
    ['SetYAxis', 'set-y-axis'],
    ['xRandomFactor', 'x-random-factor'],
  ].forEach(([input, expected]) =>
    it(`${input}`, () => {
      expect(camelOrPascalToKebabCase(input)).toEqual(expected);
    }),
  );
});
