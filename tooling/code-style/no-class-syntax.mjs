import fs                                               from 'node:fs/promises';
import path                                             from 'node:path';
import process                                          from 'node:process';

import { findClassSyntax, findClassSyntaxInSourceFile } from './class-syntax.mjs';
import {
  FILE_CONCURRENCY,
  TYPESCRIPT_EXTENSIONS,
  collectFiles,
  mapWithConcurrency
}                                                       from './file-discovery.mjs';


const DEFAULT_TARGETS = ['src'];

async function main() {
  const targets = parseArgs(process.argv.slice(2));
  const files   = await collectFiles(
    targets.length > 0 ? targets : DEFAULT_TARGETS,
    TYPESCRIPT_EXTENSIONS
  );

  if (files.length === 0) {
    throw new Error('No supported TypeScript or JavaScript files found in the requested target(s).');
  }

  const findingsByFile = await mapWithConcurrency(
    files,
    FILE_CONCURRENCY,
    async (filePath) => {
      const sourceText = await fs.readFile(filePath, 'utf8');

      return findClassSyntax(sourceText, filePath);
    }
  );
  const findings       = findingsByFile.flat();

  if (findings.length === 0) {
    console.log(`No class syntax found in ${files.length} file(s).`);
    return;
  }

  console.error(`Found ${findings.length} class implementation(s):`);
  for (const finding of findings) {
    console.error(`- ${path.relative(process.cwd(), finding.filePath)}:${finding.line}:${finding.column}`);
  }
  console.error('');
  console.error('Use factory functions, closures, and structural object types instead.');
  process.exitCode = 1;
}

function parseArgs(argv) {
  const targets       = [];
  let optionsEnded    = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!optionsEnded && arg === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && arg === '--file') {
      const nextArg = argv[index + 1];

      if (nextArg === undefined || nextArg === '--') {
        throw new Error('Missing value for --file.');
      }

      targets.push(nextArg);
      index += 1;
      continue;
    }
    if (!optionsEnded && arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    targets.push(arg);
  }

  return targets;
}

export {
  findClassSyntax,
  findClassSyntaxInSourceFile
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
