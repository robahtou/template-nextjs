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
  const root = await fs.mkdtemp(path.join(import.meta.dirname, '.fmt-file-parity-'));
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
  const formattedSource = await fs.readFile(sourcePath, 'utf8');
  assert.equal(formattedSource, [
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
  const formattedCss = await fs.readFile(cssPath, 'utf8');
  assert.equal(formattedCss, [
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
  assert.equal(await fs.readFile(sourcePath, 'utf8'), formattedSource);

  const fixedCssResult = runFormatter(root, 'example.css');
  assert.equal(fixedCssResult.status, 0, fixedCssResult.stderr);
  assert.equal(await fs.readFile(cssPath, 'utf8'), formattedCss);
});

test('fmt-file handles spaces, CONTEXT prose, missing files, and unsupported files', async (testContext) => {
  const root = await fs.mkdtemp(path.join(import.meta.dirname, '.fmt-file-targets-'));
  testContext.after(() => fs.rm(root, { recursive: true, force: true }));

  const sourcePath  = path.join(root, 'file with spaces.ts');
  const contextPath = path.join(root, 'CONTEXT.md');
  const textPath    = path.join(root, 'notes.txt');

  await fs.writeFile(sourcePath, 'const short = 1;\nconst longerName = 2;\n');
  await fs.writeFile(contextPath, '# Context\n\nThis paragraph was\nwrapped manually.\n');
  await fs.writeFile(textPath, 'leave me alone\n');

  const sourceResult = runFormatter(root, path.basename(sourcePath));
  assert.equal(sourceResult.status, 0, sourceResult.stderr);
  assert.equal(await fs.readFile(sourcePath, 'utf8'), [
    'const short      = 1;',
    'const longerName = 2;',
    ''
  ].join('\n'));

  const contextResult = runFormatter(root, path.basename(contextPath));
  assert.equal(contextResult.status, 0, contextResult.stderr);
  assert.equal(
    await fs.readFile(contextPath, 'utf8'),
    '# Context\n\nThis paragraph was wrapped manually.\n'
  );

  for (const extension of ['.cjs', '.cts', '.mts']) {
    const modulePath = path.join(root, `module${extension}`);
    await fs.writeFile(modulePath, 'const short = 1;\nconst longerName = 2;\n');

    const moduleResult = runFormatter(root, path.basename(modulePath));
    assert.equal(moduleResult.status, 0, moduleResult.stderr);
    assert.equal(await fs.readFile(modulePath, 'utf8'), [
      'const short      = 1;',
      'const longerName = 2;',
      ''
    ].join('\n'));
  }

  const missingResult = runFormatter(root, 'already-deleted.ts');
  assert.equal(missingResult.status, 0, missingResult.stderr);

  const unsupportedResult = runFormatter(root, path.basename(textPath));
  assert.equal(unsupportedResult.status, 0, unsupportedResult.stderr);
  assert.equal(await fs.readFile(textPath, 'utf8'), 'leave me alone\n');
});

test('fmt-file rejects lexical and symlink escapes from the repository', async (testContext) => {
  const root         = await fs.mkdtemp(path.join(import.meta.dirname, '.fmt-file-safety-'));
  const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-file-outside-'));
  testContext.after(() => fs.rm(root, { recursive: true, force: true }));
  testContext.after(() => fs.rm(externalRoot, { recursive: true, force: true }));

  const externalPath = path.join(externalRoot, 'outside.ts');
  const symlinkPath  = path.join(root, 'outside.ts');
  await fs.writeFile(externalPath, 'const untouched = true;\n');
  await fs.symlink(externalPath, symlinkPath);

  const lexicalResult = runFormatter(root, externalPath);
  assert.equal(lexicalResult.status, 1);
  assert.match(lexicalResult.stderr, /outside the repository/u);

  const symlinkResult = runFormatter(root, path.basename(symlinkPath));
  assert.equal(symlinkResult.status, 1);
  assert.match(symlinkResult.stderr, /resolves outside the repository/u);
  assert.equal(await fs.readFile(externalPath, 'utf8'), 'const untouched = true;\n');
});
