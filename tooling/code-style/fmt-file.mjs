import {
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync
}                         from 'node:fs';
import path               from 'node:path';
import process            from 'node:process';
import { fileURLToPath }  from 'node:url';


const SCRIPT_DIRECTORY = import.meta.dirname;
const REPOSITORY_ROOT  = realpathSync(path.resolve(SCRIPT_DIRECTORY, '..', '..'));

const TYPESCRIPT_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx'
]);

function isInsideRoot(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);

  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function parseTarget(argv, envTarget = process.env.npm_config_file) {
  let target = typeof envTarget === 'string' && envTarget.length > 0
    ? envTarget
    : null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--file') {
      const nextArg = argv[index + 1];

      if (nextArg === undefined || nextArg === '--') {
        throw new Error('Missing value for --file.');
      }

      target ??= nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    target ??= arg;
  }

  return target;
}

function resolveTargetPath(target, workingDirectory) {
  return target.startsWith('file://')
    ? path.resolve(fileURLToPath(target))
    : path.resolve(workingDirectory, target);
}

function resolveFormatTarget(
  target,
  {
    repositoryRoot = REPOSITORY_ROOT,
    workingDirectory = process.cwd()
  } = {}
) {
  const rootPath      = repositoryRoot === REPOSITORY_ROOT
    ? REPOSITORY_ROOT
    : realpathSync(repositoryRoot);
  const candidatePath = resolveTargetPath(target, workingDirectory);

  if (!isInsideRoot(rootPath, candidatePath)) {
    throw new Error(`Target is outside the repository: ${candidatePath}`);
  }

  let realTargetPath;
  try {
    realTargetPath = realpathSync(candidatePath);
  } catch (error) {
    if (
      error !== null
      && typeof error === 'object'
      && ('code' in error)
      && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return null;
    }

    throw error;
  }

  if (!isInsideRoot(rootPath, realTargetPath)) {
    throw new Error(`Target resolves outside the repository: ${candidatePath}`);
  }

  if (!lstatSync(realTargetPath).isFile()) {
    return null;
  }

  if (path.basename(realTargetPath) === 'CONTEXT.md') {
    return {
      kind      : 'context',
      targetPath: realTargetPath
    };
  }

  const extension = path.extname(realTargetPath).toLowerCase();

  if (extension === '.css') {
    return {
      kind      : 'css',
      targetPath: realTargetPath
    };
  }

  if (TYPESCRIPT_EXTENSIONS.has(extension)) {
    return {
      kind      : 'typescript',
      targetPath: realTargetPath
    };
  }

  return null;
}

function formatTextFile(targetPath, formatter) {
  const sourceText    = readFileSync(targetPath, 'utf8');
  const formattedText = formatter(sourceText, targetPath);

  if (formattedText !== sourceText) {
    writeFileSync(targetPath, formattedText, 'utf8');
  }
}

async function formatTarget(target, options = {}) {
  const resolvedTarget = resolveFormatTarget(target, options);

  if (resolvedTarget === null) {
    return false;
  }

  if (resolvedTarget.kind === 'context') {
    const { formatContextMarkdown } = await import('../../scripts/lint/context-md-prose-unwrap.mjs');

    formatTextFile(resolvedTarget.targetPath, formatContextMarkdown);
    return true;
  }

  if (resolvedTarget.kind === 'css') {
    const { formatCssSource } = await import('./css-formatting.mjs');

    formatTextFile(resolvedTarget.targetPath, formatCssSource);
    return true;
  }

  const { formatTypeScriptSource } = await import('./typescript-format-pipeline.mjs');
  const warnings                   = [];

  formatTextFile(resolvedTarget.targetPath, (sourceText, filePath) => {
    return formatTypeScriptSource(sourceText, filePath, warnings);
  });

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  return true;
}

async function main() {
  const target = parseTarget(process.argv.slice(2));

  if (target === null) {
    throw new Error('Missing target. Run `pnpm fmt:file --file <path>`.');
  }

  await formatTarget(target);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}


export {
  REPOSITORY_ROOT,
  formatTarget,
  parseTarget,
  resolveFormatTarget
};
