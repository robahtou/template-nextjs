#!/usr/bin/env node

import { existsSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT_ROOT = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const SUPPORTED_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx'
]);
const PATH_KEYS = [
  'file_path',
  'filePath',
  'edited_file_path',
  'editedFilePath',
  'path'
];
const CONTAINER_KEYS = [
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

function isInsideRoot(root, candidate) {
  const localPath = relative(root, candidate);
  return localPath !== ''
    && localPath !== '..'
    && !localPath.startsWith(`..${sep}`)
    && !isAbsolute(localPath);
}

function toAbsolutePath(filePath, root) {
  if (filePath.startsWith('file://')) {
    return resolve(fileURLToPath(filePath));
  }

  return isAbsolute(filePath) ? resolve(filePath) : resolve(root, filePath);
}

function isSupported(filePath) {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
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
    const realRoot = realpathSync(root);
    const candidate = toAbsolutePath(filePath, realRoot);

    if (!isInsideRoot(realRoot, candidate) || !existsSync(candidate)) return null;

    const realCandidate = realpathSync(candidate);
    if (!isInsideRoot(realRoot, realCandidate)) return null;
    if (!statSync(realCandidate).isFile() || !isSupported(realCandidate)) return null;

    return relative(realRoot, realCandidate);
  } catch {
    return null;
  }
}

export function formatEditedFile(
  payload,
  { root = PROJECT_ROOT, spawn = spawnSync } = {}
) {
  const editedPath = extractEditedPath(payload);
  if (!editedPath) return false;

  const target = resolveFormatTarget(editedPath, root);
  if (!target) return false;

  try {
    const result = spawn(
      'pnpm',
      ['fmt:file', '--file', target],
      {
        cwd: root,
        shell: false,
        stdio: 'ignore',
        timeout: 20_000,
        windowsHide: true
      }
    );

    return !result.error && result.status === 0;
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
    formatEditedFile(payload);
  } catch {
    // Formatting is best-effort; malformed input and formatter failures fail open.
  }

  process.stdout.write('{}\n');
}

const isDirectExecution = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) await main();
