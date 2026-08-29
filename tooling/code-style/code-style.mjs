import fs                           from 'node:fs/promises';
import path                         from 'node:path';
import process                      from 'node:process';

import { formatCssSource }          from './css-formatting.mjs';
import {
  CSS_EXTENSIONS,
  FILE_CONCURRENCY,
  TYPESCRIPT_EXTENSIONS,
  collectFiles,
  isCssFile,
  isTypeScriptFile,
  mapWithConcurrency
}                                   from './file-discovery.mjs';
import { processTypeScriptSource }  from './typescript-format-pipeline.mjs';


const DEFAULT_TARGETS         = [
  'src',
  'scripts',
  'tooling'
];
const DEFAULT_OPTIONAL_FILES  = [
  'next.config.ts',
  'postcss.config.js'
];
const SUPPORTED_EXTENSIONS    = new Set([
  ...TYPESCRIPT_EXTENSIONS,
  ...CSS_EXTENSIONS
]);

function isMissingPathError(error) {
  return error !== null
    && typeof error === 'object'
    && ('code' in error)
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function isInsideOrEqual(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);

  return relativePath === ''
    || (
      relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath)
    );
}

function parseArgs(argv) {
  let mode = null;
  let optionsEnded = false;
  const targets = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!optionsEnded && arg === '--') {
      optionsEnded = true;
      continue;
    }

    if (!optionsEnded && (arg === '--check' || arg === '--fix')) {
      const nextMode = arg.slice(2);

      if (mode !== null && mode !== nextMode) {
        throw new Error('Choose exactly one mode: --check or --fix.');
      }

      mode = nextMode;
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

    if (!optionsEnded && arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    targets.push(arg);
  }

  if (mode === null) {
    throw new Error('Expected exactly one mode: --check or --fix.');
  }

  return {
    mode   : mode,
    targets: targets
  };
}

async function resolveDefaultTargets(workingDirectory) {
  const optionalTargets = await Promise.all(
    DEFAULT_OPTIONAL_FILES.map(async (relativePath) => {
      try {
        await fs.access(path.resolve(workingDirectory, relativePath));
        return relativePath;
      } catch (error) {
        if (isMissingPathError(error)) {
          return null;
        }

        throw error;
      }
    })
  );

  return [
    ...DEFAULT_TARGETS,
    ...optionalTargets.filter((target) => target !== null)
  ];
}

function shouldProcessCssFile(filePath, hasExplicitTargets, workingDirectory) {
  return hasExplicitTargets
    || isInsideOrEqual(path.resolve(workingDirectory, 'src'), filePath);
}

async function processSourceFile(filePath, mode) {
  const sourceText = await fs.readFile(filePath, 'utf8');

  if (isCssFile(filePath)) {
    const formattedText = formatCssSource(sourceText);
    const changed       = formattedText !== sourceText;

    if (changed && mode === 'fix') {
      await fs.writeFile(filePath, formattedText, 'utf8');
    }

    return {
      changed       : changed,
      classFindings : [],
      filePath      : filePath,
      warnings      : []
    };
  }

  const warnings = [];
  const {
    classFindings,
    formattedText
  } = processTypeScriptSource(
    sourceText,
    filePath,
    warnings,
    { checkClasses: mode === 'check' }
  );
  const changed       = formattedText !== sourceText;

  if (changed && mode === 'fix') {
    await fs.writeFile(filePath, formattedText, 'utf8');
  }

  return {
    changed       : changed,
    classFindings : classFindings,
    filePath      : filePath,
    warnings      : warnings
  };
}

function reportWarnings(results) {
  for (const result of results) {
    for (const warning of result.warnings) {
      console.warn(`warning: ${warning}`);
    }
  }
}

function reportClassFindings(classFindings, workingDirectory) {
  if (classFindings.length === 0) {
    return;
  }

  console.error(`Found ${classFindings.length} class implementation(s):`);
  for (const finding of classFindings) {
    console.error([
      '- ',
      path.relative(workingDirectory, finding.filePath),
      `:${finding.line}:${finding.column}`
    ].join(''));
  }
}

function reportChangedFiles(changedFiles, mode, workingDirectory) {
  if (changedFiles.length === 0) {
    return;
  }

  const action = mode === 'fix' ? 'Formatted' : 'Found formatting issues in';
  const writer = mode === 'fix' ? console.log : console.error;

  writer(`${action} ${changedFiles.length} file(s):`);
  for (const filePath of changedFiles) {
    writer(`- ${path.relative(workingDirectory, filePath)}`);
  }
}

async function runCodeStyle(
  {
    argumentsList = process.argv.slice(2),
    workingDirectory = process.cwd()
  } = {}
) {
  const { mode, targets } = parseArgs(argumentsList);
  const hasExplicitTargets  = targets.length > 0;
  const scanTargets         = hasExplicitTargets
    ? targets
    : await resolveDefaultTargets(workingDirectory);
  const discoveredFiles     = await collectFiles(
    scanTargets,
    SUPPORTED_EXTENSIONS,
    { workingDirectory }
  );
  const files               = discoveredFiles.filter((filePath) => {
    if (isTypeScriptFile(filePath)) {
      return true;
    }

    return isCssFile(filePath)
      && shouldProcessCssFile(filePath, hasExplicitTargets, workingDirectory);
  });

  if (files.length === 0) {
    console.log('No supported TypeScript, JavaScript, or CSS files found.');
    return 0;
  }

  const results       = await mapWithConcurrency(
    files,
    FILE_CONCURRENCY,
    (filePath) => processSourceFile(filePath, mode)
  );
  const changedFiles  = results
    .filter((result) => result.changed)
    .map((result) => result.filePath);
  const classFindings = results.flatMap((result) => result.classFindings);

  reportWarnings(results);
  reportClassFindings(classFindings, workingDirectory);
  reportChangedFiles(changedFiles, mode, workingDirectory);

  if (mode === 'check' && (changedFiles.length > 0 || classFindings.length > 0)) {
    return 1;
  }

  if (changedFiles.length === 0) {
    console.log(`All ${files.length} file(s) match the code-style contract.`);
  }

  return 0;
}

if (import.meta.main) {
  runCodeStyle()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}


export {
  parseArgs,
  processSourceFile,
  resolveDefaultTargets,
  runCodeStyle
};
