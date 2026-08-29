#!/usr/bin/env node

import { realpathSync }                           from 'node:fs';
import { extname, relative, resolve, sep }        from 'node:path';

import {
  formatTarget as formatRepositoryTarget,
  resolveFormatTarget as resolveRepositoryTarget
}                                                 from '../../tooling/code-style/fmt-file.mjs';


const PROJECT_ROOT          = realpathSync(resolve(import.meta.dirname, '../..'));
const SUPPORTED_EXTENSIONS  = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx'
]);
const PATH_KEYS             = [
  'file_path',
  'filePath',
  'edited_file_path',
  'editedFilePath',
  'path'
];
const CONTAINER_KEYS        = [
  'tool_input',
  'toolInput',
  'input',
  'arguments',
  'args',
  'params',
  'result'
];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isSupported(filePath) {
  return filePath.endsWith(`${sep}CONTEXT.md`)
    || SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function extractEditedPath(payload) {
  if (!isRecord(payload)) return null;

  const containers = [payload];
  for (const key of CONTAINER_KEYS) {
    if (isRecord(payload[key])) containers.push(payload[key]);
  }

  for (const container of containers) {
    for (const key of PATH_KEYS) {
      const value = container[key];
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
    }
  }

  return null;
}

export function resolveFormatTarget(filePath, root = PROJECT_ROOT) {
  try {
    const realRoot       = realpathSync(root);
    const resolvedTarget = resolveRepositoryTarget(
      filePath,
      {
        repositoryRoot  : realRoot,
        workingDirectory: realRoot
      }
    );

    return resolvedTarget === null
      ? null
      : relative(realRoot, resolvedTarget.targetPath);
  } catch {
    return null;
  }
}

export async function formatEditedFile(
  payload,
  {
    format = formatRepositoryTarget,
    root = PROJECT_ROOT
  } = {}
) {
  const editedPath = extractEditedPath(payload);
  if (!editedPath) return false;

  try {
    return await format(
      editedPath,
      {
        repositoryRoot  : root,
        workingDirectory: root
      }
    );
  } catch {
    return false;
  }
}

async function readPayload(stream) {
  stream.setEncoding('utf8');

  let input = '';
  for await (const chunk of stream) {
    input += chunk;
    if (input.length > 1_000_000) throw new Error('Hook payload is too large');
  }

  return JSON.parse(input || '{}');
}

export async function main() {
  try {
    const payload = await readPayload(process.stdin);
    await formatEditedFile(payload);
  } catch {
    // Formatting is best-effort; malformed input and formatter failures fail open.
  }

  process.stdout.write('{}\n');
}

if (import.meta.main) await main();
