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

const CHAR_NEWLINE = 10;
const CHAR_EQUALS  = 61;

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
    console.log(`All ${files.length} file(s) already match the TypeScript const layout.`);
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

  console.error(`Found ${changedFiles.length} file(s) with TypeScript const layout issues:`);
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

export function formatSourceText(sourceText, filePath) {
  let nextText = normalizeLineEndings(sourceText);

  nextText = formatAlignableDeclarationGroups(nextText, filePath);

  if (!nextText.endsWith('\n')) {
    nextText += '\n';
  }

  return nextText;
}

function normalizeLineEndings(sourceText) {
  return sourceText.replace(/\r\n/g, '\n');
}

function formatAlignableDeclarationGroups(sourceText, filePath) {
  let nextText = sourceText;

  for (;;) {
    const sourceFile = createSourceFile(filePath, nextText);

    if (sourceFile.parseDiagnostics.length > 0) {
      return nextText;
    }

    const declarationGroups = getRenderableDeclarationGroups(sourceFile, nextText);

    if (declarationGroups.length === 0) {
      return nextText;
    }

    // Groups are sorted ascending and non-overlapping, so one forward segment join applies the
    // whole pass without repeated string splicing.
    const parts = [];
    let cursor = 0;

    for (const declarationGroup of declarationGroups) {
      parts.push(nextText.slice(cursor, declarationGroup.start), declarationGroup.renderedGroup);
      cursor = declarationGroup.end;
    }

    parts.push(nextText.slice(cursor));

    const nextPassText = parts.join('');

    if (nextPassText === nextText) {
      return nextPassText;
    }

    nextText = nextPassText;
  }
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

function getRenderableDeclarationGroups(sourceFile, sourceText) {
  const declarationGroups = [];

  function visit(node) {
    if (isStatementListOwner(node)) {
      declarationGroups.push(...findRenderableDeclarationGroupsInStatementList(node.statements, sourceFile, sourceText));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const unstableGroups = declarationGroups.filter((declarationGroup) => {
    return declarationGroup.renderedGroup !== sourceText.slice(declarationGroup.start, declarationGroup.end);
  });

  return unstableGroups
    .filter((declarationGroup, groupIndex) => {
      return !unstableGroups.some((otherGroup, otherGroupIndex) => {
        if (groupIndex === otherGroupIndex) {
          return false;
        }

        return otherGroup.start >= declarationGroup.start
          && otherGroup.end <= declarationGroup.end
          && (otherGroup.start !== declarationGroup.start || otherGroup.end !== declarationGroup.end);
      });
    })
    .sort((leftGroup, rightGroup) => leftGroup.start - rightGroup.start);
}

function isStatementListOwner(node) {
  return ts.isSourceFile(node)
    || ts.isBlock(node)
    || ts.isModuleBlock(node)
    || ts.isCaseClause(node)
    || ts.isDefaultClause(node);
}

function findRenderableDeclarationGroupsInStatementList(statements, sourceFile, sourceText) {
  const declarationGroups = [];
  let currentGroup = [];

  function flushCurrentGroup() {
    if (currentGroup.length < 2) {
      currentGroup = [];
      return;
    }

    declarationGroups.push(renderDeclarationGroup(currentGroup));
    currentGroup = [];
  }

  for (const statement of statements) {
    const candidate = classifyAlignableStatement(statement, sourceFile, sourceText);

    if (candidate === null) {
      flushCurrentGroup();
      continue;
    }

    if (currentGroup.length === 0) {
      currentGroup = [candidate];
      continue;
    }

    const previousCandidate = currentGroup.at(-1);
    const gapText           = sourceText.slice(previousCandidate.end, candidate.start);

    if (
      !declarationStatementGapIsSafe(previousCandidate, candidate, gapText)
      || previousCandidate.declarationPrefixText !== candidate.declarationPrefixText
      || previousCandidate.groupKind !== candidate.groupKind
      || previousCandidate.breakGroupAfter
    ) {
      flushCurrentGroup();
      currentGroup = [candidate];
      continue;
    }

    currentGroup.push(candidate);
  }

  flushCurrentGroup();

  return declarationGroups;
}

function classifyAlignableStatement(statement, sourceFile, sourceText) {
  return classifyConstStatement(statement, sourceFile, sourceText)
    ?? classifyTypeAliasStatement(statement, sourceFile, sourceText);
}

function classifyConstStatement(statement, sourceFile, sourceText) {
  if (!ts.isVariableStatement(statement)) {
    return null;
  }

  if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
    return null;
  }

  if (statement.declarationList.declarations.length !== 1) {
    return null;
  }

  const declaration = statement.declarationList.declarations[0];

  if (declaration.initializer === undefined) {
    return null;
  }

  const groupKind = classifyConstDeclarationGroupKind(declaration.name);

  if (groupKind === null) {
    return null;
  }

  const equalsStart = getEqualsStartBefore(declaration.initializer, sourceText);

  if (equalsStart === null) {
    return null;
  }

  if (hasTrailingCommentTrivia(statement, sourceText)) {
    return null;
  }

  const lineStart         = getLineStartPosition(sourceText, statement.getStart(sourceFile));
  const statementStart    = statement.getStart(sourceFile);
  const statementEnd      = getRenderableStatementEndPosition(sourceText, statement.getEnd());
  const initializerStart  = declaration.initializer.getStart(sourceFile);
  const indentationText   = sourceText.slice(lineStart, statementStart);

  if (!/^[ \t]*$/u.test(indentationText)) {
    return null;
  }

  if (
    hasNewlineBetween(sourceText, statementStart, equalsStart)
    || hasNewlineBetween(sourceText, equalsStart, initializerStart)
  ) {
    return null;
  }

  const declarationPrefixText   = sourceText.slice(statementStart, declaration.name.getStart(sourceFile));
  const keyText                 = sourceText.slice(declaration.name.getStart(sourceFile), equalsStart).replace(/[ \t]+$/u, '');
  const initializerText         = sourceText.slice(initializerStart, statementEnd).trimEnd();
  const statementText           = sourceText.slice(statementStart, statementEnd);
  const expectedStatementPrefix = `${declarationPrefixText}${keyText}`;

  if (
    keyText.length === 0
    || initializerText.length === 0
    || !statementText.startsWith(expectedStatementPrefix)
  ) {
    return null;
  }

  return {
    breakGroupAfter       : shouldBreakConstGroupAfter(declaration, groupKind, sourceFile, sourceText),
    declarationPrefixText : declarationPrefixText,
    end                   : statementEnd,
    groupKind             : groupKind,
    indentationText       : indentationText,
    initializerText       : initializerText,
    keyText               : keyText,
    statementStart        : statementStart,
    start                 : lineStart
  };
}

function classifyTypeAliasStatement(statement, sourceFile, sourceText) {
  if (!ts.isTypeAliasDeclaration(statement)) {
    return null;
  }

  const equalsStart = getEqualsStartBefore(statement.type, sourceText);

  if (equalsStart === null) {
    return null;
  }

  if (hasTrailingCommentTrivia(statement, sourceText)) {
    return null;
  }

  const lineStart       = getLineStartPosition(sourceText, statement.getStart(sourceFile));
  const statementStart  = statement.getStart(sourceFile);
  const statementEnd    = getRenderableStatementEndPosition(sourceText, statement.getEnd());
  const typeStart       = statement.type.getStart(sourceFile);
  const indentationText = sourceText.slice(lineStart, statementStart);

  if (!/^[ \t]*$/u.test(indentationText)) {
    return null;
  }

  if (
    hasNewlineBetween(sourceText, statementStart, equalsStart)
    || hasNewlineBetween(sourceText, equalsStart, typeStart)
  ) {
    return null;
  }

  const declarationPrefixText   = sourceText.slice(statementStart, statement.name.getStart(sourceFile));
  const keyText                 = sourceText.slice(statement.name.getStart(sourceFile), equalsStart).replace(/[ \t]+$/u, '');
  const initializerText         = sourceText.slice(typeStart, statementEnd).trimEnd();
  const statementText           = sourceText.slice(statementStart, statementEnd);
  const expectedStatementPrefix = `${declarationPrefixText}${keyText}`;

  if (
    keyText.length === 0
    || initializerText.length === 0
    || !statementText.startsWith(expectedStatementPrefix)
  ) {
    return null;
  }

  return {
    breakGroupAfter       : false,
    declarationPrefixText : declarationPrefixText,
    end                   : statementEnd,
    groupKind             : 'type-alias',
    indentationText       : indentationText,
    initializerText       : initializerText,
    keyText               : keyText,
    statementStart        : statementStart,
    start                 : lineStart
  };
}

function classifyConstDeclarationGroupKind(name) {
  if (ts.isIdentifier(name)) {
    return 'identifier';
  }

  if (ts.isArrayBindingPattern(name)) {
    return 'array-binding-pattern';
  }

  return null;
}

function shouldBreakConstGroupAfter(declaration, groupKind, sourceFile, sourceText) {
  return groupKind === 'array-binding-pattern'
    && hasNewlineBetween(sourceText, declaration.getStart(sourceFile), declaration.end);
}

function getEqualsStartBefore(valueNode, sourceText) {
  // A node's pos is the full start right after the previous token, and the token before an
  // initializer or aliased type is always `=`; reading it from the text avoids ts getChildren()
  // token materialization entirely.
  const equalsStart = valueNode.pos - 1;

  return sourceText.charCodeAt(equalsStart) === CHAR_EQUALS ? equalsStart : null;
}

function hasTrailingCommentTrivia(node, sourceText) {
  const trailingTrivia = sourceText.slice(node.getEnd(), node.end);

  return trailingTrivia.includes('//') || trailingTrivia.includes('/*');
}

function hasNewlineBetween(sourceText, startPosition, endPosition) {
  const newlineIndex = sourceText.indexOf('\n', startPosition);

  return newlineIndex !== -1 && newlineIndex < endPosition;
}

function declarationStatementGapIsSafe(previousCandidate, candidate, gapText) {
  if (previousCandidate.groupKind === 'type-alias' && candidate.groupKind === 'type-alias') {
    return /^[ \t\n]*$/u.test(gapText);
  }

  return gapText.includes('\n')
    && /^[ \t\n]*$/u.test(gapText)
    && !/\n[ \t]*\n/u.test(gapText);
}

function renderDeclarationGroup(declarationGroup) {
  const targetLength          = chooseDeclarationTargetLength(declarationGroup);
  const groupIndentationText  = chooseGroupIndentationText(declarationGroup);
  const renderedGroup         = declarationGroup
    .map((candidate) => renderDeclarationStatement(candidate, targetLength, groupIndentationText))
    .join('\n');

  return {
    end           : declarationGroup.at(-1).end,
    renderedGroup : renderedGroup,
    start         : declarationGroup[0].start
  };
}

function chooseDeclarationTargetLength(declarationGroup) {
  let maxLength = 0;

  for (const candidate of declarationGroup) {
    if (candidate.keyText.length > maxLength) {
      maxLength = candidate.keyText.length;
    }
  }

  if (declarationGroup.length === 2) {
    return maxLength;
  }

  const columnAfterLongestName = maxLength + 1;

  return columnAfterLongestName % 2 === 1 ? maxLength + 1 : maxLength;
}

function chooseGroupIndentationText(declarationGroup) {
  let chosenIndentationText = '';

  for (const candidate of declarationGroup) {
    if (candidate.indentationText.length > chosenIndentationText.length) {
      chosenIndentationText = candidate.indentationText;
    }
  }

  return chosenIndentationText;
}

function renderDeclarationStatement(candidate, targetLength, groupIndentationText) {
  const paddingWidth = Math.max(0, targetLength - candidate.keyText.length);

  return `${groupIndentationText}${candidate.declarationPrefixText}${candidate.keyText}${' '.repeat(paddingWidth)} = ${candidate.initializerText}`;
}

function getLineStartPosition(sourceText, position) {
  let lineStart = position;

  while (lineStart > 0 && sourceText.charCodeAt(lineStart - 1) !== CHAR_NEWLINE) {
    lineStart -= 1;
  }

  return lineStart;
}

function getRenderableStatementEndPosition(sourceText, position) {
  const newlineIndex = sourceText.indexOf('\n', position);

  return newlineIndex === -1 ? sourceText.length : newlineIndex;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
