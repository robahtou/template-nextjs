import assert             from 'node:assert/strict';
import { spawnSync }      from 'node:child_process';
import fs                 from 'node:fs/promises';
import os                 from 'node:os';
import path               from 'node:path';
import process            from 'node:process';
import test               from 'node:test';
import { fileURLToPath }  from 'node:url';


const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('uses one space after the longest import binding when there are exactly two imports', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'two-imports.ts');
  const input           = [
    'import shortName from \'./short.js\';',
    'import longerDefault from \'./longer.js\';',
    '',
    'void shortName;',
    'void longerDefault;',
    ''
  ].join('\n');
  const expectedOutput  = [
    'import shortName     from \'./short.js\';',
    'import longerDefault from \'./longer.js\';',
    '',
    '',
    'void shortName;',
    'void longerDefault;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('anchors a lone wrapped import on its longest stacked specifier line', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath = path.join(tempDirectory, 'lone-wrapped-import.ts');
  const input       = [
    'import { ProblemDetailsSchema, TabExecutionHistoryResponseSchema, TabExecutionParamsSchema } from \'@eop/resource-api-contracts/tab-executions\';',
    '',
    'void ProblemDetailsSchema;',
    'void TabExecutionHistoryResponseSchema;',
    'void TabExecutionParamsSchema;',
    ''
  ].join('\n');
  // Longest stacked line is `  TabExecutionHistoryResponseSchema,` (36 chars), so the cursor after
  // it sits on odd column 37 and `from` starts two spaces later on column 39.
  const expectedOutput  = [
    'import {',
    '  ProblemDetailsSchema,',
    '  TabExecutionHistoryResponseSchema,',
    '  TabExecutionParamsSchema',
    `${'}'.padEnd(38)}from '@eop/resource-api-contracts/tab-executions';`,
    '',
    '',
    'void ProblemDetailsSchema;',
    'void TabExecutionHistoryResponseSchema;',
    'void TabExecutionParamsSchema;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('keeps a wrapped import aligned with a wider block column', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath = path.join(tempDirectory, 'wrapped-import-in-block.ts');
  const input       = [
    'import type { TabExecutionMode, TabExecutionRecord } from \'#Types/db/tabExecutions\';',
    'import { buildRowsetTruncation, mapDispatchedExecutionError, orchestratePreparedExecution } from \'#Pipelines/lib/executionCore/index\';',
    'import { createLogger } from \'#Logging/index\';',
    '',
    'void buildRowsetTruncation;',
    'void mapDispatchedExecutionError;',
    'void orchestratePreparedExecution;',
    'void createLogger;',
    ''
  ].join('\n');
  // The type import anchors the shared column at 55, which beats the wrapped import's own
  // stacked-line column of 33, so the wrapped `from` still aligns with the block.
  const expectedOutput  = [
    `${'import type { TabExecutionMode, TabExecutionRecord }'.padEnd(54)}from '#Types/db/tabExecutions';`,
    'import {',
    '  buildRowsetTruncation,',
    '  mapDispatchedExecutionError,',
    '  orchestratePreparedExecution',
    `${'}'.padEnd(54)}from '#Pipelines/lib/executionCore/index';`,
    `${'import { createLogger }'.padEnd(54)}from '#Logging/index';`,
    '',
    '',
    'void buildRowsetTruncation;',
    'void mapDispatchedExecutionError;',
    'void orchestratePreparedExecution;',
    'void createLogger;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('anchors a lone wrapped named re-export on its longest stacked specifier line', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'lone-wrapped-re-export.ts');
  const input           = [
    'export { ProblemDetailsSchema, TabExecutionHistoryResponseSchema, TabExecutionParamsSchema } from \'@eop/resource-api-contracts/tab-executions\';',
    ''
  ].join('\n');
  const expectedOutput  = [
    'export {',
    '  ProblemDetailsSchema,',
    '  TabExecutionHistoryResponseSchema,',
    '  TabExecutionParamsSchema',
    `${'}'.padEnd(38)}from '@eop/resource-api-contracts/tab-executions';`,
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('preserves and aligns import attributes', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'json-import-attributes.ts');
  const input           = [
    'import requestBody from \'./request.body.json\' with { type: \'json\' };',
    'import response201Body from \'./response.201.body.json\' with { type: \'json\' };',
    '',
    'const schema = { requestBody, response201Body };',
    ''
  ].join('\n');
  const expectedOutput  = [
    'import requestBody     from \'./request.body.json\'      with { type: \'json\' };',
    'import response201Body from \'./response.201.body.json\' with { type: \'json\' };',
    '',
    '',
    'const schema = { requestBody, response201Body };',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('formats imports after a use client directive', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'directive-imports.tsx');
  const input           = [
    '\'use client\';import type { ChangeEvent }        from \'react\';',
    'import type { AppLocale }          from \'@I18n/routing\';',
    '',
    'import { useLocale, useTranslations } from \'next-intl\';',
    'import { useSearchParams }            from \'next/navigation\';',
    'import { useTransition }              from \'react\';',
    '',
    'function noop(changeEvent: ChangeEvent<HTMLInputElement>, locale: AppLocale): void {',
    '  void changeEvent;',
    '  void locale;',
    '  void useLocale;',
    '  void useTranslations;',
    '  void useSearchParams;',
    '  void useTransition;',
    '}',
    ''
  ].join('\n');
  const expectedOutput  = [
    '\'use client\';',
    '',
    'import type { ChangeEvent }           from \'react\';',
    'import type { AppLocale }             from \'@I18n/routing\';',
    '',
    'import { useLocale, useTranslations } from \'next-intl\';',
    'import { useSearchParams }            from \'next/navigation\';',
    'import { useTransition }              from \'react\';',
    '',
    '',
    'function noop(changeEvent: ChangeEvent<HTMLInputElement>, locale: AppLocale): void {',
    '  void changeEvent;',
    '  void locale;',
    '  void useLocale;',
    '  void useTranslations;',
    '  void useSearchParams;',
    '  void useTransition;',
    '}',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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

test('preserves blank lines between regular import subgroups', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-import-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'grouped-imports.tsx');
  const input           = [
    '\'use client\';',
    '',
    'import type { ChangeEvent } from \'react\';',
    'import type { AppLocale } from \'@I18n/routing\';',
    '',
    'import { useLocale, useTranslations } from \'next-intl\';',
    'import { useSearchParams } from \'next/navigation\';',
    'import { useTransition } from \'react\';',
    '',
    'import { Box, CircularProgress, MenuItem, TextField } from \'@mui/material\';',
    'import { usePathname, useRouter } from \'@I18n/navigation\';',
    'import { localeValues } from \'@I18n/routing\';',
    '',
    'import styles from \'./styles.module.css\';',
    '',
    'function noop(changeEvent: ChangeEvent<HTMLInputElement>, locale: AppLocale): void {',
    '  void changeEvent;',
    '  void locale;',
    '  void useLocale;',
    '  void useTranslations;',
    '  void useSearchParams;',
    '  void useTransition;',
    '  void Box;',
    '  void CircularProgress;',
    '  void MenuItem;',
    '  void TextField;',
    '  void usePathname;',
    '  void useRouter;',
    '  void localeValues;',
    '  void styles;',
    '}',
    ''
  ].join('\n');
  const expectedOutput  = [
    '\'use client\';',
    '',
    'import type { ChangeEvent }                           from \'react\';',
    'import type { AppLocale }                             from \'@I18n/routing\';',
    '',
    'import { useLocale, useTranslations }                 from \'next-intl\';',
    'import { useSearchParams }                            from \'next/navigation\';',
    'import { useTransition }                              from \'react\';',
    '',
    'import { Box, CircularProgress, MenuItem, TextField } from \'@mui/material\';',
    'import { usePathname, useRouter }                     from \'@I18n/navigation\';',
    'import { localeValues }                               from \'@I18n/routing\';',
    '',
    'import styles                                         from \'./styles.module.css\';',
    '',
    '',
    'function noop(changeEvent: ChangeEvent<HTMLInputElement>, locale: AppLocale): void {',
    '  void changeEvent;',
    '  void locale;',
    '  void useLocale;',
    '  void useTranslations;',
    '  void useSearchParams;',
    '  void useTransition;',
    '  void Box;',
    '  void CircularProgress;',
    '  void MenuItem;',
    '  void TextField;',
    '  void usePathname;',
    '  void useRouter;',
    '  void localeValues;',
    '  void styles;',
    '}',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-import-layout.mjs', '--fix', '--file', fixturePath],
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
