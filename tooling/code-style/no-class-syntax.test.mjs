import assert               from 'node:assert/strict';
import { spawnSync }        from 'node:child_process';
import fs                   from 'node:fs/promises';
import os                   from 'node:os';
import path                 from 'node:path';
import process              from 'node:process';
import test                 from 'node:test';
import { fileURLToPath }    from 'node:url';

import { findClassSyntax }  from './no-class-syntax.mjs';


const checkerPath = fileURLToPath(new URL('./no-class-syntax.mjs', import.meta.url));
const repoRoot    = fileURLToPath(new URL('../../', import.meta.url));

function runCli(args, cwd = repoRoot) {
  return spawnSync(
    process.execPath,
    [checkerPath, ...args],
    {
      cwd     : cwd,
      encoding: 'utf8'
    }
  );
}

test('reports named and anonymous class implementations', () => {
  const findings = findClassSyntax([
    'export class Named {}',
    'const Anonymous = class {};',
    ''
  ].join('\n'));

  assert.deepEqual(
    findings.map(({ line, column }) => ({ line, column })),
    [
      { line: 1, column: 1 },
      { line: 2, column: 19 }
    ]
  );
});

test('reports abstract, ambient, decorated, default, and expression forms', () => {
  const findings = findClassSyntax([
    'abstract class Abstract {}',
    'declare class Ambient {}',
    'function sealed(value: unknown) { return value; }',
    '@sealed',
    'class Decorated {}',
    'export default class {}',
    'const NamedExpression = class Named {};',
    'const AnonymousExpression = class {};',
    ''
  ].join('\n'), 'forms.ts');

  assert.deepEqual(findings, [
    { filePath: 'forms.ts', line: 1, column: 1 },
    { filePath: 'forms.ts', line: 2, column: 1 },
    { filePath: 'forms.ts', line: 4, column: 1 },
    { filePath: 'forms.ts', line: 6, column: 1 },
    { filePath: 'forms.ts', line: 7, column: 25 },
    { filePath: 'forms.ts', line: 8, column: 29 }
  ]);
});

test('ignores class text in comments, strings, and property names', () => {
  const findings = findClassSyntax([
    '// class Comment {}',
    "const template = 'class Generated {}';",
    "const source = { class: 'value' };",
    ''
  ].join('\n'));

  assert.deepEqual(findings, []);
});

test('fails clearly when the compatibility parser rejects source syntax', () => {
  assert.throws(
    () => findClassSyntax('const broken = {', 'broken.ts'),
    /broken\.ts:1:17 is not parseable by the TypeScript 6 compatibility API/u
  );
});

test('CLI scans every supported module extension', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-extensions-'));
  testContext.after(() => fs.rm(tempDirectory, { recursive: true, force: true }));

  const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
  await Promise.all(
    extensions.map((extension) => {
      return fs.writeFile(path.join(tempDirectory, `clean${extension}`), 'const value = 1;\n');
    })
  );

  const result = runCli([tempDirectory]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No class syntax found in 8 file\(s\)\./u);

  await Promise.all(
    extensions.map((extension) => {
      return fs.writeFile(path.join(tempDirectory, `clean${extension}`), 'const value = class {};\n');
    })
  );

  const classResult = runCli([tempDirectory]);

  assert.equal(classResult.status, 1, classResult.stdout);
  assert.match(classResult.stderr, /Found 8 class implementation\(s\):/u);
  for (const extension of extensions) {
    assert.ok(classResult.stderr.includes(`clean${extension}:1:15`));
  }
});

test('CLI skips generated, ignored, and nested symbolic-link trees', async (testContext) => {
  const tempDirectory  = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-ignored-'));
  const externalTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-external-'));
  testContext.after(async () => {
    await Promise.all([
      fs.rm(tempDirectory, { recursive: true, force: true }),
      fs.rm(externalTarget, { recursive: true, force: true })
    ]);
  });

  await fs.mkdir(path.join(tempDirectory, '.openchamber'), { recursive: true });
  await fs.mkdir(path.join(tempDirectory, '.pnpm-staging-modules'), { recursive: true });
  await fs.mkdir(path.join(tempDirectory, '_monorepo_plans'), { recursive: true });
  await fs.writeFile(path.join(tempDirectory, '.openchamber', 'ignored.ts'), 'class Ignored {}\n');
  await fs.writeFile(path.join(tempDirectory, '.pnpm-staging-modules', 'staged.js'), 'class Staged {}\n');
  await fs.writeFile(path.join(tempDirectory, '_monorepo_plans', 'example.ts'), 'class Planned {}\n');
  await fs.writeFile(path.join(externalTarget, 'linked.ts'), 'class Linked {}\n');
  await fs.symlink(externalTarget, path.join(tempDirectory, 'linked-source'));
  await fs.writeFile(path.join(tempDirectory, 'allowed.ts'), 'const value = 1;\n');

  const result = runCli([tempDirectory]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No class syntax found in 1 file\(s\)\./u);
  assert.doesNotMatch(result.stderr, /ignored|linked|planned|staged/ui);
});

test('CLI executes through a symbolic link', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-entry-link-'));
  testContext.after(() => fs.rm(tempDirectory, { recursive: true, force: true }));

  const linkedChecker = path.join(tempDirectory, 'linked-checker.mjs');
  const cleanTarget   = path.join(tempDirectory, 'clean.ts');
  await fs.symlink(checkerPath, linkedChecker);
  await fs.writeFile(cleanTarget, 'const value = 1;\n');

  const result = spawnSync(
    process.execPath,
    [linkedChecker, cleanTarget],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No class syntax found in 1 file\(s\)\./u);
});

test('CLI follows explicit symbolic-link file and directory targets only', async (testContext) => {
  const tempDirectory     = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-links-'));
  const externalDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-link-target-'));
  testContext.after(async () => {
    await Promise.all([
      fs.rm(tempDirectory, { recursive: true, force: true }),
      fs.rm(externalDirectory, { recursive: true, force: true })
    ]);
  });

  const externalFile    = path.join(externalDirectory, 'linked-file.ts');
  const directoryClass  = path.join(externalDirectory, 'directory-class.ts');
  const linkedFile      = path.join(tempDirectory, 'explicit-file.ts');
  const linkedDirectory = path.join(tempDirectory, 'explicit-directory');
  await fs.writeFile(externalFile, 'class LinkedFile {}\n');
  await fs.writeFile(directoryClass, 'class DirectoryClass {}\n');
  await fs.symlink(externalFile, linkedFile);
  await fs.symlink(externalDirectory, linkedDirectory);

  const fileResult = runCli([linkedFile]);
  assert.equal(fileResult.status, 1, fileResult.stdout);
  assert.match(fileResult.stderr, /explicit-file\.ts:1:1/u);

  const directoryResult = runCli([linkedDirectory]);
  assert.equal(directoryResult.status, 1, directoryResult.stdout);
  assert.match(directoryResult.stderr, /directory-class\.ts:1:1/u);
  assert.match(directoryResult.stderr, /linked-file\.ts:1:1/u);

  await fs.writeFile(path.join(tempDirectory, 'clean.ts'), 'const value = 1;\n');
  const discoveredResult = runCli([tempDirectory]);
  assert.equal(discoveredResult.status, 0, discoveredResult.stderr);
  assert.match(discoveredResult.stdout, /No class syntax found in 1 file\(s\)\./u);
});

test('CLI fails when a target has no supported source files', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-empty-'));
  testContext.after(() => fs.rm(tempDirectory, { recursive: true, force: true }));

  const emptyResult = runCli([tempDirectory]);
  assert.equal(emptyResult.status, 1, emptyResult.stdout);
  assert.match(
    emptyResult.stderr,
    /No supported TypeScript or JavaScript files found in the requested target\(s\)\./u
  );

  await fs.writeFile(path.join(tempDirectory, 'unsupported.txt'), 'class NotParsed {}\n');
  const unsupportedResult = runCli([tempDirectory]);
  assert.equal(unsupportedResult.status, 1, unsupportedResult.stdout);
  assert.match(
    unsupportedResult.stderr,
    /No supported TypeScript or JavaScript files found in the requested target\(s\)\./u
  );
});

test('CLI treats -- as the end of options', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'no-class-syntax-options-'));
  testContext.after(() => fs.rm(tempDirectory, { recursive: true, force: true }));

  const dashedTarget = path.join(tempDirectory, '--source');
  await fs.mkdir(dashedTarget);
  await fs.writeFile(path.join(dashedTarget, 'clean.ts'), 'const value = 1;\n');

  const result = runCli(['--', '--source'], tempDirectory);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No class syntax found in 1 file\(s\)\./u);
});
