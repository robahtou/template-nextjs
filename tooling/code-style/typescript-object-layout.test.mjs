import assert             from 'node:assert/strict';
import { spawnSync }      from 'node:child_process';
import fs                 from 'node:fs/promises';
import os                 from 'node:os';
import path               from 'node:path';
import process            from 'node:process';
import test               from 'node:test';
import { fileURLToPath }  from 'node:url';


const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('aligns type literal properties with multiline type annotations', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-object-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'multiline-type-literal.ts');
  const input           = [
    'type LocaleLayoutProps = {',
    '  children: ReactNode;',
    '  params    : Promise<{',
    '    locale: string;',
    '  }>;',
    '};',
    ''
  ].join('\n');
  const expectedOutput  = [
    'type LocaleLayoutProps = {',
    '  children: ReactNode;',
    '  params  : Promise<{',
    '    locale: string;',
    '  }>;',
    '};',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-object-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('aligns type literal properties with same-line trailing comments', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-object-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'commented-type-literal.ts');
  const input           = [
    'type PgLikeError = {',
    '  code?: string;   // SQLSTATE',
    '  detail?: string; // JSON string from PG_EXCEPTION_DETAIL',
    '  message?: string;',
    '  hint?: string;',
    '};',
    ''
  ].join('\n');
  const expectedOutput  = [
    'type PgLikeError = {',
    '  code?     : string;   // SQLSTATE',
    '  detail?   : string; // JSON string from PG_EXCEPTION_DETAIL',
    '  message?  : string;',
    '  hint?     : string;',
    '};',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-object-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('aligns object literals while preserving inter-property comments', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-object-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'commented-object-literal.ts');
  const input           = [
    'const nextConfig = {',
    '  cacheComponents: true,',
    '  partialPrefetching: true,',
    '  reactCompiler: true,',
    '',
    '  // Keep production navigation-test output isolated from an active dev server.',
    '  distDir: \'.next\',',
    '',
    '  experimental: {',
    '    cssChunking: true,',
    '    // AIDEV-NOTE: testing lock stays opt-in.',
    '    exposeTestingApiInProductionBuild: false,',
    '    // rootParams: true,',
    '    taint: true,',
    '    turbopackRustReactCompiler: true,',
    '  },',
    '',
    '  // Keep pino external.',
    '  serverExternalPackages: [\'pino\'],',
    '  poweredByHeader: false,',
    '  output: \'standalone\'',
    '};',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const nextConfig = {',
    '  cacheComponents         : true,',
    '  partialPrefetching      : true,',
    '  reactCompiler           : true,',
    '',
    '  // Keep production navigation-test output isolated from an active dev server.',
    '  distDir                 : \'.next\',',
    '',
    '  experimental            : {',
    '    cssChunking                       : true,',
    '    // AIDEV-NOTE: testing lock stays opt-in.',
    '    exposeTestingApiInProductionBuild : false,',
    '    // rootParams: true,',
    '    taint                             : true,',
    '    turbopackRustReactCompiler        : true',
    '  },',
    '',
    '  // Keep pino external.',
    '  serverExternalPackages  : [\'pino\'],',
    '  poweredByHeader         : false,',
    '  output                  : \'standalone\'',
    '};',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-object-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('preserves same-line trailing comments on object literal properties', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-object-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'trailing-comment-object-literal.ts');
  const input           = [
    'const flags = {',
    '  alpha: true, // first',
    '  beta: false,',
    '  gamma: true // last',
    '};',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const flags = {',
    '  alpha : true, // first',
    '  beta  : false,',
    '  gamma : true // last',
    '};',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-object-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('aligns class property declarations without rewriting constructors', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-object-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'class-properties.ts');
  const input           = [
    'export class DataApiError extends Error {',
    '  code: ErrorCode;',
    '  statusCode: number;',
    '  type: string;',
    '  sqlstate: string | null;',
    '  details: unknown;',
    '  hint: string | null;',
    '',
    '  constructor() {}',
    '}',
    ''
  ].join('\n');
  const expectedOutput  = [
    'export class DataApiError extends Error {',
    '  code        : ErrorCode;',
    '  statusCode  : number;',
    '  type        : string;',
    '  sqlstate    : string | null;',
    '  details     : unknown;',
    '  hint        : string | null;',
    '',
    '  constructor() {}',
    '}',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-object-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});
