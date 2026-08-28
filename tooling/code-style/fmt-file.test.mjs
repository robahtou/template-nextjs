import assert             from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os                 from 'node:os';
import path               from 'node:path';
import { spawnSync }      from 'node:child_process';
import test               from 'node:test';


const FORMATTER_PATH = path.resolve(import.meta.dirname, 'fmt-file.mjs');


function runFormatter(root, relativePath) {
  return spawnSync(
    process.execPath,
    [FORMATTER_PATH, '--file', relativePath],
    {
      cwd     : root,
      encoding: 'utf8'
    }
  );
}


test('fmt-file applies the canonical TypeScript and CSS formatter pipeline', async (testContext) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-file-parity-'));
  testContext.after(() => fs.rm(root, { recursive: true, force: true }));

  const sourcePath = path.join(root, 'example.ts');
  const cssPath    = path.join(root, 'example.css');

  await fs.writeFile(sourcePath, [
    "import { runtime } from './runtime';",
    "import type { Value } from './types';",
    '',
    'const short = 1;',
    'const longerName = 2;',
    '',
    'function example(',
    'short: string, longerName: number',
    ') {',
    '  return {',
    'short, renamed: longerName',
    '  };',
    '}',
    '',
    'export default example;',
    ''
  ].join('\n'));
  await fs.writeFile(cssPath, [
    '@layer components {',
    '  /**',
    '      * Card defaults.',
    '      *   Preserve relative indentation.',
    '      */',
    '.card {',
    'color: #AABBCC;',
    'padding: 1rem',
    '}',
    '}',
    ''
  ].join('\n'));

  const sourceResult = runFormatter(root, 'example.ts');
  assert.equal(sourceResult.status, 0, sourceResult.stderr);
  assert.equal(await fs.readFile(sourcePath, 'utf8'), [
    "import type { Value } from './types';",
    "import { runtime }    from './runtime';",
    '',
    '',
    'const short      = 1;',
    'const longerName = 2;',
    '',
    'function example(',
    '  short     : string,',
    '  longerName: number',
    ') {',
    '  return {',
    '    short  : short,',
    '    renamed: longerName',
    '  };',
    '}',
    '',
    '',
    'export default example;',
    ''
  ].join('\n'));

  const cssResult = runFormatter(root, 'example.css');
  assert.equal(cssResult.status, 0, cssResult.stderr);
  assert.equal(await fs.readFile(cssPath, 'utf8'), [
    '@layer components {',
    '  /**',
    '   * Card defaults.',
    '   *   Preserve relative indentation.',
    '   */',
    '  .card {',
    '    color   : #aabbcc;',
    '    padding : 1rem;',
    '  }',
    '}',
    ''
  ].join('\n'));

  const fixedSourceResult = runFormatter(root, 'example.ts');
  assert.equal(fixedSourceResult.status, 0, fixedSourceResult.stderr);
  assert.match(fixedSourceResult.stdout, /already match the TypeScript object layout/u);

  const fixedCssResult = runFormatter(root, 'example.css');
  assert.equal(fixedCssResult.status, 0, fixedCssResult.stderr);
  assert.match(fixedCssResult.stdout, /already match the CSS formatting style/u);
});
