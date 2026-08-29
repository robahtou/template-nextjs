import assert               from 'node:assert/strict';
import test                 from 'node:test';

import { formatCssSource }  from './css-formatting.mjs';


test('formats layered CSS and reaches a fixed point', () => {
  const source   = [
    '@layer components {',
    '/**',
    '    * Card defaults.',
    '    */',
    '.card {',
    'color: #AABBCC;',
    'padding: 1rem',
    '}',
    '}',
    ''
  ].join('\n');
  const expected = [
    '@layer components {',
    '  /**',
    '   * Card defaults.',
    '   */',
    '  .card {',
    '    color   : #aabbcc;',
    '    padding : 1rem;',
    '  }',
    '}',
    ''
  ].join('\n');

  assert.equal(formatCssSource(source), expected);
  assert.equal(formatCssSource(expected), expected);
});

test('preserves strings and custom-property values while normalizing layout', () => {
  const source   = [
    ':root{',
    '--message:\"keep;this\";',
    '--gradient:linear-gradient(#ABCDEF, #123456);',
    '}',
    ''
  ].join('\n');
  const expected = [
    ':root {',
    '  --message   : "keep;this";',
    '  --gradient  : linear-gradient(#abcdef, #123456);',
    '}',
    ''
  ].join('\n');

  assert.equal(formatCssSource(source), expected);
});

test('preserves shared custom-media declarations', () => {
  const source = '@custom-media --wide (width >= 64rem);\n';

  assert.equal(formatCssSource(source), source);
});
