import assert             from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os                 from 'node:os';
import path               from 'node:path';
import test               from 'node:test';
import {
  formatContextMarkdown,
  parseMode,
  runContextMarkdown
}                         from './context-md-prose-unwrap.mjs';


async function withMutedConsole(callback) {
  const originalError = console.error;
  const originalLog   = console.log;
  console.error = () => {};
  console.log = () => {};
  try {
    return await callback();
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
}

test('CONTEXT prose unwrap preserves Markdown structure and fenced code', () => {
  const source   = [
    '# Context',
    '',
    'This prose was',
    'wrapped by an editor.',
    '',
    '- A list item',
    '  continues on another line.',
    '- Another item.',
    '',
    '> A quoted paragraph',
    '> continues here.',
    '',
    'A hard break  ',
    'stays on two lines.',
    '',
    '```ts',
    'const wrapped =',
    '  true;',
    '```',
    '',
    '| Name | Value |',
    '| --- | --- |',
    '| one | two |',
    '',
  ].join('\n');
  const expected = [
    '# Context',
    '',
    'This prose was wrapped by an editor.',
    '',
    '- A list item continues on another line.',
    '- Another item.',
    '',
    '> A quoted paragraph continues here.',
    '',
    'A hard break  ',
    'stays on two lines.',
    '',
    '```ts',
    'const wrapped =',
    '  true;',
    '```',
    '',
    '| Name | Value |',
    '| --- | --- |',
    '| one | two |',
    '',
  ].join('\n');

  const formatted = formatContextMarkdown(source);
  assert.equal(formatted, expected);
  assert.equal(formatContextMarkdown(formatted), formatted);
});

test('CONTEXT prose unwrap preserves CRLF', () => {
  assert.equal(
    formatContextMarkdown('# Context\r\n\r\nWrapped\r\nprose.\r\n'),
    '# Context\r\n\r\nWrapped prose.\r\n',
  );
});

test('CONTEXT CLI requires an explicit mode', () => {
  assert.equal(parseMode(['--check']), 'check');
  assert.equal(parseMode(['--fix']), 'fix');
  assert.throws(() => parseMode([]), /--check or --fix/u);
  assert.throws(() => parseMode(['--fix', '--check']), /--check or --fix/u);
});

test('CONTEXT check is non-mutating and fix reaches the checked fixed point', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-prose-'));
  context.after(() => fs.rm(root, { force: true, recursive: true }));

  const filePath = path.join(root, 'docs', 'CONTEXT.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const original = '# Context\n\nWrapped\nprose.\n';
  await fs.writeFile(filePath, original);

  assert.equal(await withMutedConsole(() => runContextMarkdown({
    argumentsList : ['--check'],
    repositoryRoot: root
  })), 1);
  assert.equal(await fs.readFile(filePath, 'utf8'), original);

  assert.equal(await withMutedConsole(() => runContextMarkdown({
    argumentsList : ['--fix'],
    repositoryRoot: root
  })), 0);
  assert.equal(await fs.readFile(filePath, 'utf8'), '# Context\n\nWrapped prose.\n');

  assert.equal(await withMutedConsole(() => runContextMarkdown({
    argumentsList : ['--check'],
    repositoryRoot: root
  })), 0);
});

test('CONTEXT scan excludes negative fixture directories', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-fixtures-'));
  context.after(() => fs.rm(root, { force: true, recursive: true }));

  const fixturePath = path.join(root, 'docs', 'fixtures', 'CONTEXT.md');
  await fs.mkdir(path.dirname(fixturePath), { recursive: true });
  await fs.writeFile(fixturePath, '# Context\n\nWrapped\nprose.\n');

  assert.equal(await withMutedConsole(() => runContextMarkdown({
    argumentsList : ['--check'],
    repositoryRoot: root
  })), 0);
});
