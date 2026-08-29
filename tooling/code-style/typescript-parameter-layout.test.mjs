import assert               from 'node:assert/strict';
import test                 from 'node:test';

import { formatSourceText } from './typescript-parameter-layout.mjs';


test('aligns typed parameters in multiline declarations', () => {
  const source   = [
    'function example(',
    'short: string,',
    'longerName?: number,',
    'finalValue: boolean',
    ') {}',
    ''
  ].join('\n');
  const expected = [
    'function example(',
    '  short       : string,',
    '  longerName? : number,',
    '  finalValue  : boolean',
    ') {}',
    ''
  ].join('\n');

  assert.equal(formatSourceText(source, 'example.ts'), expected);
  assert.equal(formatSourceText(expected, 'example.ts'), expected);
});

test('leaves call arguments and single-line declarations unchanged', () => {
  const source = [
    'function inline(first: string, second: number) {}',
    'const result = inline(',
    'first,',
    'second',
    ');',
    ''
  ].join('\n');

  assert.equal(formatSourceText(source, 'example.ts'), source);
});

test('leaves commented parameter gaps unchanged', () => {
  const source = [
    'function documented(',
    '  first: string, // preserve this explanation',
    '  second: number',
    ') {}',
    ''
  ].join('\n');

  assert.equal(formatSourceText(source, 'example.ts'), source);
});

test('fails clearly when source is not parseable by the compatibility API', () => {
  assert.throws(
    () => formatSourceText('function broken(', 'broken.ts'),
    /not parseable by the TypeScript 6 compatibility API/u
  );
});
