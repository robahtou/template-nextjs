import assert                           from 'node:assert/strict';
import { realpathSync }                 from 'node:fs';
import { dirname, resolve }             from 'node:path';
import { spawnSync }                    from 'node:child_process';
import test                             from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  extractEditedPath,
  formatEditedFile,
  isSupported,
  resolveFormatTarget
}                                       from './run-fmt-file.mjs';


const HOOK_DIRECTORY  = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT    = realpathSync(resolve(HOOK_DIRECTORY, '../..'));
const HOOK_PATH       = resolve(HOOK_DIRECTORY, 'run-fmt-file.mjs');

test('extracts common direct and nested path fields', () => {
  assert.equal(extractEditedPath({ file_path: 'src/app/page.tsx' }), 'src/app/page.tsx');
  assert.equal(
    extractEditedPath({ toolInput: { filePath: 'src/app/layout.tsx' } }),
    'src/app/layout.tsx'
  );
  assert.equal(extractEditedPath({ path: '  ' }), null);
  assert.equal(extractEditedPath(null), null);
});

test('recognizes every single-file formatter target', () => {
  for (const extension of ['cjs', 'css', 'cts', 'js', 'jsx', 'mjs', 'mts', 'ts', 'tsx']) {
    assert.equal(isSupported(resolve(PROJECT_ROOT, `example.${extension}`)), true);
  }

  assert.equal(isSupported(resolve(PROJECT_ROOT, 'docs/CONTEXT.md')), true);
  assert.equal(isSupported(resolve(PROJECT_ROOT, 'README.md')), false);
});

test('accepts only existing supported files inside the project', () => {
  assert.equal(
    resolveFormatTarget(HOOK_PATH, PROJECT_ROOT),
    '.cursor/hooks/run-fmt-file.mjs'
  );
  assert.equal(
    resolveFormatTarget(pathToFileURL(HOOK_PATH).href, PROJECT_ROOT),
    '.cursor/hooks/run-fmt-file.mjs'
  );
  assert.equal(resolveFormatTarget('.cursor/hooks.json', PROJECT_ROOT), null);
  assert.equal(
    resolveFormatTarget('tooling/code-style/CONTEXT.md', PROJECT_ROOT),
    'tooling/code-style/CONTEXT.md'
  );
  assert.equal(resolveFormatTarget('deleted.ts', PROJECT_ROOT), null);
  assert.equal(resolveFormatTarget(resolve(PROJECT_ROOT, '../outside.ts'), PROJECT_ROOT), null);
});

test('passes the edited path to the repository formatter', async () => {
  let invocation;
  const format = async (target, options) => {
    invocation = { options, target };
    return true;
  };

  assert.equal(
    await formatEditedFile(
      { input: { path: HOOK_PATH } },
      { format, root: PROJECT_ROOT }
    ),
    true
  );
  assert.equal(invocation.target, HOOK_PATH);
  assert.equal(invocation.options.repositoryRoot, PROJECT_ROOT);
  assert.equal(invocation.options.workingDirectory, PROJECT_ROOT);
});

test('fails open when the formatter cannot run', async () => {
  const format = async () => {
    throw new Error('unavailable');
  };

  assert.equal(
    await formatEditedFile(
      { filePath: HOOK_PATH },
      { format, root: PROJECT_ROOT }
    ),
    false
  );
});

test('always emits JSON for malformed input', () => {
  const result = spawnSync(
    process.execPath,
    [HOOK_PATH],
    {
      encoding  : 'utf8',
      input     : '{invalid',
      timeout   : 5_000
    }
  );

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {});
});
