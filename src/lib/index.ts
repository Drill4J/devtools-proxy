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

export function camelOrPascalToKebabCase(str: string): string {
  return str
    .split('')
    .reduce((a, x, i, f) => {
      const prev = f[i - 1];
      if (!prev) return x;

      const pair = prev + x;

      // ab, AB - leave as-is
      if (/([a-z]{2}|[A-Z]{2})/.test(pair)) return a + x;

      // Ab - add dash before A
      if (/[A-Z][a-z]/.test(pair)) return `${a.substring(0, a.length - 1)}-${prev}${x}`;

      // aB - add dash before B
      return `${a}-${x}`;
    }, '')
    .replace(/--/g, '-') // remove double dashes
    .replace(/^-/, '') // remove leading dash
    .toLowerCase();
}
