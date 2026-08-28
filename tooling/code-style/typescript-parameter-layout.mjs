import fs       from 'node:fs/promises';
import path     from 'node:path';
import process  from 'node:process';
import ts       from '@typescript/typescript6';


const DEFAULT_TARGETS         = ['src'];
const DEFAULT_OPTIONAL_FILES  = ['next.config.ts'];
const FILE_CONCURRENCY        = 16;
const IGNORED_DIRECTORIES     = new Set([
  '.cursor',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'node_modules'
]);
const SUPPORTED_EXTENSIONS    = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const CHAR_NEWLINE      = 10;
const CHAR_SPACE        = 32;
const CHAR_OPEN_PAREN   = 40;
const CHAR_CLOSE_PAREN  = 41;
const CHAR_COMMA        = 44;
const CHAR_AT           = 64;
const CHAR_TAB          = 9;

async function main() {
  const { fix, targets } = parseArgs(process.argv.slice(2));
  const files = await collectFiles(
    targets.length > 0 ? targets : await resolveDefaultTargets()
  );

  if (files.length === 0) {
    console.log('No supported files found.');
    return;
  }

  const changed = await mapWithConcurrency(files, FILE_CONCURRENCY, async (filePath) => {
    const original  = await fs.readFile(filePath, 'utf8');
    const formatted = formatSourceText(original, filePath);

    if (formatted === original) {
      return false;
    }

    if (fix) {
      await fs.writeFile(filePath, formatted, 'utf8');
    }

    return true;
  });

  const changedFiles = files.filter((filePath, fileIndex) => changed[fileIndex]);

  if (changedFiles.length === 0) {
    console.log(`All ${files.length} file(s) already match the TypeScript parameter layout.`);
    return;
  }

  const relativePaths = changedFiles.map((filePath) => path.relative(process.cwd(), filePath));

  if (fix) {
    console.log(`Formatted ${changedFiles.length} file(s):`);
    for (const relativePath of relativePaths) {
      console.log(`- ${relativePath}`);
    }
    return;
  }

  console.error(`Found ${changedFiles.length} file(s) with TypeScript parameter layout issues:`);
  for (const relativePath of relativePaths) {
    console.error(`- ${relativePath}`);
  }
  console.error('');
  console.error('Run with --fix to apply formatting.');
  process.exitCode = 1;
}

function parseArgs(argv) {
  let fix = false;
  const targets = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--fix') {
      fix = true;
      continue;
    }

    if (arg === '--file') {
      const nextArg = argv[index + 1];

      if (nextArg === undefined || nextArg === '--') {
        throw new Error('Missing value for --file.');
      }

      targets.push(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    targets.push(arg);
  }

  return { fix, targets };
}

async function resolveDefaultTargets() {
  const optionalFiles = [];

  for (const relativePath of DEFAULT_OPTIONAL_FILES) {
    try {
      await fs.access(path.resolve(process.cwd(), relativePath));
      optionalFiles.push(relativePath);
    } catch {
      // Optional root config files are skipped when absent from the package.
    }
  }

  return [...DEFAULT_TARGETS, ...optionalFiles];
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length).fill(undefined);
  let nextIndex = 0;

  async function runWorker() {
    for (;;) {
      const itemIndex = nextIndex;

      if (itemIndex >= items.length) {
        return;
      }

      nextIndex += 1;
      results[itemIndex] = await task(items[itemIndex], itemIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers     = [];

  for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
    workers.push(runWorker());
  }

  await Promise.all(workers);

  return results;
}

async function collectFiles(targets) {
  const collected = new Set();

  await Promise.all(
    targets.map((target) => walkPath(path.resolve(process.cwd(), target), collected))
  );

  return Array.from(collected).sort();
}

async function walkPath(targetPath, collected) {
  let stats;

  try {
    stats = await fs.stat(targetPath);
  } catch (error) {
    throw new Error(`Target not found: ${targetPath}`, { cause: error });
  }

  if (stats.isDirectory()) {
    await walkDirectory(targetPath, collected);
    return;
  }

  if (stats.isFile() && isSupportedFile(targetPath)) {
    collected.add(targetPath);
  }
}

async function walkDirectory(directoryPath, collected) {
  const entries      = await fs.readdir(directoryPath, { withFileTypes: true });
  const pendingWalks = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        pendingWalks.push(walkDirectory(entryPath, collected));
      }
      continue;
    }

    if (entry.isFile()) {
      if (isSupportedFile(entryPath)) {
        collected.add(entryPath);
      }
      continue;
    }

    if (entry.isSymbolicLink()) {
      // Symlinks resolve through stat so linked files and directories keep the previous follow behavior.
      pendingWalks.push(walkPath(entryPath, collected));
    }
  }

  await Promise.all(pendingWalks);
}

function isSupportedFile(filePath) {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath));
}

function formatSourceText(sourceText, filePath) {
  let nextText = normalizeLineEndings(sourceText);

  nextText = formatParameterLists(nextText, filePath);

  if (!nextText.endsWith('\n')) {
    nextText += '\n';
  }

  return nextText;
}

function normalizeLineEndings(sourceText) {
  return sourceText.replace(/\r\n/g, '\n');
}

function formatParameterLists(sourceText, filePath) {
  const sourceFile     = createSourceFile(filePath, sourceText);
  const parameterLists = getRenderableParameterLists(sourceFile, sourceText);

  if (parameterLists.length === 0) {
    return sourceText;
  }

  // Candidates arrive in ascending, non-overlapping source order (pre-order visit plus the nested
  // filter), so one forward segment join applies every rewrite without repeated string splicing.
  const parts = [];
  let cursor = 0;

  for (const parameterList of parameterLists) {
    parts.push(
      sourceText.slice(cursor, parameterList.listStart),
      renderParameterList(parameterList, sourceText)
    );
    cursor = parameterList.listEnd;
  }

  parts.push(sourceText.slice(cursor));

  return parts.join('');
}

function createSourceFile(filePath, sourceText) {
  // AIDEV-NOTE: setParentNodes stays false because every AST accessor here passes sourceFile
  // explicitly; skipping parent wiring avoids a full extra tree walk per parse.
  return ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    false,
    getScriptKind(filePath)
  );
}

function getScriptKind(filePath) {
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }

  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }

  if (filePath.endsWith('.js')) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function getRenderableParameterLists(sourceFile, sourceText) {
  const candidates = [];

  function visit(node) {
    if (isSupportedParameterListOwner(node)) {
      const candidate = createRenderableParameterListCandidate(node, sourceFile, sourceText);

      if (candidate !== null) {
        candidates.push(candidate);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // AIDEV-NOTE: Skip nested signatures inside another parameter list so an outer rewrite never invalidates an inner range.
  return candidates.filter((candidate, candidateIndex) => {
    return !candidates.some((otherCandidate, otherIndex) => {
      if (otherIndex === candidateIndex) {
        return false;
      }

      return candidate.listStart > otherCandidate.listStart
        && candidate.listEnd < otherCandidate.listEnd;
    });
  });
}

function isSupportedParameterListOwner(node) {
  return ts.isArrowFunction(node)
    || ts.isCallSignatureDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isConstructSignatureDeclaration(node)
    || ts.isConstructorTypeNode(node)
    || ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isFunctionTypeNode(node)
    || ts.isMethodDeclaration(node)
    || ts.isMethodSignature(node)
    || ts.isSetAccessorDeclaration(node);
}

function createRenderableParameterListCandidate(node, sourceFile, sourceText) {
  if (node.parameters.length === 0) {
    return null;
  }

  const parenPositions = getParameterParenPositions(node, sourceText);

  if (parenPositions === null) {
    return null;
  }

  if (!hasNewlineBetween(sourceText, parenPositions.openParenStart, parenPositions.closeParenStart)) {
    return null;
  }

  // One pass validates the comma gaps, records blank-line separators, and classifies each
  // parameter, so rendering never has to re-derive any of it.
  const parameterInfos = [];
  let previousEnd      = node.parameters.pos;
  let hasAligned       = false;

  for (const parameter of node.parameters) {
    const gapText = sourceText.slice(previousEnd, parameter.getStart(sourceFile));

    if (!parameterGapIsSafe(gapText)) {
      return null;
    }

    const parameterInfo = classifyParameter(parameter, sourceFile, sourceText);

    parameterInfo.hasBlankLineBefore = gapHasBlankLine(stripParameterGapPunctuation(gapText));

    if (parameterInfo.renderKind === 'aligned-parameter') {
      hasAligned = true;
    }

    parameterInfos.push(parameterInfo);
    previousEnd = parameter.end;
  }

  if (!parameterGapIsSafe(sourceText.slice(previousEnd, parenPositions.closeParenStart))) {
    return null;
  }

  if (!hasAligned) {
    return null;
  }

  return {
    listEnd         : parenPositions.closeParenStart + 1,
    listStart       : parenPositions.openParenStart,
    parameterInfos  : parameterInfos
  };
}

function getParameterParenPositions(node, sourceText) {
  // node.parameters.pos sits immediately after the opening paren token, so the paren itself is one
  // position back; reading it from the text avoids ts getChildren() token materialization entirely.
  const openParenStart = node.parameters.pos - 1;

  if (sourceText.charCodeAt(openParenStart) !== CHAR_OPEN_PAREN) {
    return null;
  }

  let closeParenStart = ts.skipTrivia(sourceText, node.parameters.end);

  if (sourceText.charCodeAt(closeParenStart) === CHAR_COMMA) {
    closeParenStart = ts.skipTrivia(sourceText, closeParenStart + 1);
  }

  if (sourceText.charCodeAt(closeParenStart) !== CHAR_CLOSE_PAREN) {
    return null;
  }

  return { closeParenStart, openParenStart };
}

function hasNewlineBetween(sourceText, startPosition, endPosition) {
  const newlineIndex = sourceText.indexOf('\n', startPosition);

  return newlineIndex !== -1 && newlineIndex < endPosition;
}

function parameterGapIsSafe(gapText) {
  // AIDEV-NOTE: Comments opt a signature out because this formatter only rewrites trivia-free comma gaps.
  return /^[\s,]*$/u.test(gapText);
}

function renderParameterList(parameterList, sourceText) {
  const parameterInfos        = parameterList.parameterInfos;
  const baseIndent            = getLineIndentAtPosition(sourceText, parameterList.listStart);
  const alignedParameterInfos = parameterInfos.filter((parameterInfo) => parameterInfo.renderKind === 'aligned-parameter');
  const targetLength          = chooseParameterTargetLength(alignedParameterInfos);
  const bodyParts             = [];

  for (let index = 0; index < parameterInfos.length; index += 1) {
    const renderedParameter = renderParameterInfo(parameterInfos[index], {
      baseIndent    : baseIndent,
      isLast        : index === parameterInfos.length - 1,
      targetLength  : targetLength
    });

    if (index === 0) {
      bodyParts.push(renderedParameter);
      continue;
    }

    bodyParts.push(`${parameterInfos[index].hasBlankLineBefore ? '\n\n' : '\n'}${renderedParameter}`);
  }

  return `(\n${bodyParts.join('')}\n${baseIndent})`;
}

function classifyParameter(parameter, sourceFile, sourceText) {
  const parameterStart = parameter.getStart(sourceFile);

  if (sourceText.charCodeAt(parameterStart) === CHAR_AT) {
    return rawParameterInfo(parameterStart, parameter.end, sourceText);
  }

  if (parameter.type === undefined || !ts.isIdentifier(parameter.name)) {
    return rawParameterInfo(parameterStart, parameter.end, sourceText);
  }

  if (hasNewlineBetween(sourceText, parameter.type.getStart(sourceFile), parameter.type.end)) {
    return rawParameterInfo(parameterStart, parameter.end, sourceText);
  }

  if (
    parameter.initializer !== undefined
    && hasNewlineBetween(sourceText, parameter.initializer.getStart(sourceFile), parameter.initializer.end)
  ) {
    return rawParameterInfo(parameterStart, parameter.end, sourceText);
  }

  const keyText = buildParameterKeyText(parameter, sourceFile, sourceText);

  if (keyText === null) {
    return rawParameterInfo(parameterStart, parameter.end, sourceText);
  }

  return {
    hasBlankLineBefore  : false,
    initializerText     : parameter.initializer === undefined
      ? ''
      : ` = ${sourceText.slice(parameter.initializer.getStart(sourceFile), parameter.initializer.end)}`,
    keyText             : keyText,
    renderKind          : 'aligned-parameter',
    typeText            : sourceText.slice(parameter.type.getStart(sourceFile), parameter.type.end)
  };
}

function rawParameterInfo(parameterStart, parameterEnd, sourceText) {
  return {
    hasBlankLineBefore  : false,
    rawText             : sourceText.slice(parameterStart, parameterEnd),
    renderKind          : 'raw'
  };
}

function buildParameterKeyText(parameter, sourceFile, sourceText) {
  if (!ts.isIdentifier(parameter.name)) {
    return null;
  }

  const modifierText = parameter.modifiers === undefined
    ? ''
    : parameter.modifiers.map((modifier) => {
      return sourceText.slice(modifier.getStart(sourceFile), modifier.end);
    }).join(' ');
  const nameText     = `${parameter.dotDotDotToken !== undefined ? '...' : ''}${parameter.name.text}${parameter.questionToken !== undefined ? '?' : ''}`;

  return modifierText.length > 0 ? `${modifierText} ${nameText}` : nameText;
}

function chooseParameterTargetLength(alignedParameterInfos) {
  if (alignedParameterInfos.length === 0) {
    return null;
  }

  let maxLength = 0;

  for (const parameterInfo of alignedParameterInfos) {
    if (parameterInfo.keyText.length > maxLength) {
      maxLength = parameterInfo.keyText.length;
    }
  }

  if (alignedParameterInfos.length <= 2) {
    return maxLength;
  }

  return maxLength + (maxLength % 2 === 0 ? 2 : 1);
}

function renderParameterInfo(parameterInfo, options) {
  if (parameterInfo.renderKind === 'aligned-parameter') {
    return renderAlignedParameter(parameterInfo, options);
  }

  return renderRawParameter(parameterInfo.rawText, options);
}

function renderAlignedParameter(parameterInfo, options) {
  const paddingWidth = Math.max(0, options.targetLength - parameterInfo.keyText.length);
  const baseLine     = `${options.baseIndent}  ${parameterInfo.keyText}${' '.repeat(paddingWidth)}: ${parameterInfo.typeText}${parameterInfo.initializerText}`;

  return options.isLast ? baseLine : `${baseLine},`;
}

function renderRawParameter(rawText, options) {
  const prefixedText = prefixFirstLine(rawText, `${options.baseIndent}  `);

  return options.isLast ? prefixedText : `${prefixedText},`;
}

function prefixFirstLine(text, prefix) {
  const lines = text.split('\n');

  lines[0] = `${prefix}${lines[0].trimStart()}`;

  return lines.join('\n');
}

function getLineIndentAtPosition(sourceText, position) {
  let lineStart = position;

  while (lineStart > 0 && sourceText.charCodeAt(lineStart - 1) !== CHAR_NEWLINE) {
    lineStart -= 1;
  }

  let indentEnd = lineStart;

  while (indentEnd < position) {
    const code = sourceText.charCodeAt(indentEnd);

    if (code !== CHAR_SPACE && code !== CHAR_TAB) {
      break;
    }

    indentEnd += 1;
  }

  return sourceText.slice(lineStart, indentEnd);
}

function gapHasBlankLine(text) {
  return /\n[ \t]*\n/u.test(text);
}

function stripParameterGapPunctuation(gapText) {
  return gapText.replace(/,/gu, '');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
