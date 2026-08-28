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

const CHAR_TAB          = 9;
const CHAR_NEWLINE      = 10;
const CHAR_SPACE        = 32;
const CHAR_ASTERISK     = 42;
const CHAR_COMMA        = 44;
const CHAR_SLASH        = 47;
const CHAR_CLOSE_BRACE  = 125;

// AIDEV-NOTE: Shared results for the common comment-free gap keep analyzeGap allocation-free on the hot path.
const EMPTY_PREFIX_LINES = Object.freeze([]);
const EMPTY_GAP_ANALYSIS = Object.freeze({ prefixLines: EMPTY_PREFIX_LINES, trailingCommentText: '' });

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
    console.log(`All ${files.length} file(s) already match the TypeScript object layout.`);
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

  console.error(`Found ${changedFiles.length} file(s) with TypeScript object layout issues:`);
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

  nextText = formatObjectLikeBlocks(nextText, filePath);

  if (!nextText.endsWith('\n')) {
    nextText += '\n';
  }

  return nextText;
}

function normalizeLineEndings(sourceText) {
  return sourceText.replace(/\r\n/g, '\n');
}

function formatObjectLikeBlocks(sourceText, filePath) {
  let nextText = sourceText;

  for (;;) {
    const sourceFile = createSourceFile(filePath, nextText);
    const blocks     = getRenderableObjectLikeBlocks(sourceFile, nextText);

    if (blocks.length === 0) {
      return nextText;
    }

    // AIDEV-NOTE: Apply only unstable leaf blocks per pass so nested object rewrites land before any
    // parent block rebuild. Blocks arrive in ascending, non-overlapping source order from the DFS
    // visit, so one forward segment join applies the whole pass without repeated string splicing.
    const parts = [];
    let cursor = 0;

    for (const block of blocks) {
      parts.push(nextText.slice(cursor, block.start), block.renderedBlock);
      cursor = block.end;
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

function getRenderableObjectLikeBlocks(sourceFile, sourceText) {
  const blocks = [];

  function visit(node) {
    let hasUnstableRenderableDescendant = false;

    ts.forEachChild(node, (child) => {
      if (visit(child)) {
        hasUnstableRenderableDescendant = true;
      }
    });

    if (!isRenderableObjectLike(node, sourceFile, sourceText)) {
      return hasUnstableRenderableDescendant;
    }

    const renderedBlock = renderObjectLikeBlock(node, sourceFile, sourceText);

    if (renderedBlock === null) {
      return hasUnstableRenderableDescendant;
    }

    const { start, end }            = getObjectLikeRange(node, sourceFile);
    const originalBlock             = sourceText.slice(start, end);
    const isUnstableRenderableBlock = renderedBlock !== originalBlock;

    if (isUnstableRenderableBlock && !hasUnstableRenderableDescendant) {
      blocks.push({
        end           : end,
        renderedBlock : renderedBlock,
        start         : start
      });
    }

    return hasUnstableRenderableDescendant || isUnstableRenderableBlock;
  }

  visit(sourceFile);

  return blocks;
}

function isRenderableObjectLike(node, sourceFile, sourceText) {
  if (!isObjectLikeNode(node)) {
    return false;
  }

  if (!hasNewlineBetween(sourceText, node.getStart(sourceFile), node.end)) {
    return false;
  }

  // Gap safety is validated inside renderObjectLikeBlock, which returns null for unsafe gaps;
  // checking it twice here would double the per-object scanning work.
  return getObjectLikeMembers(node).length > 0;
}

function isObjectLikeNode(node) {
  return ts.isObjectLiteralExpression(node)
    || ts.isTypeLiteralNode(node)
    || ts.isClassDeclaration(node)
    || ts.isClassExpression(node);
}

function hasNewlineBetween(sourceText, startPosition, endPosition) {
  const newlineIndex = sourceText.indexOf('\n', startPosition);

  return newlineIndex !== -1 && newlineIndex < endPosition;
}

function getObjectLikeMembers(node) {
  return ts.isObjectLiteralExpression(node) ? node.properties : node.members;
}

function getObjectLikeContext(node) {
  if (ts.isObjectLiteralExpression(node)) {
    return 'objectLiteral';
  }

  if (ts.isTypeLiteralNode(node)) {
    return 'typeLiteral';
  }

  return 'classBody';
}

function getObjectBodyStart(node) {
  return ts.isObjectLiteralExpression(node) ? node.properties.pos : node.members.pos;
}

function getObjectBodyEnd(node, sourceText) {
  // The close brace is the final token of every object-like node, so its start is node.end - 1;
  // reading it from the text avoids ts getChildren() token materialization entirely.
  if (sourceText.charCodeAt(node.end - 1) === CHAR_CLOSE_BRACE) {
    return node.end - 1;
  }

  return ts.isObjectLiteralExpression(node) ? node.properties.end : node.members.end;
}

function getObjectLikeRange(node, sourceFile) {
  if (ts.isObjectLiteralExpression(node) || ts.isTypeLiteralNode(node)) {
    return {
      end  : node.end,
      start: node.getStart(sourceFile)
    };
  }

  return {
    end  : node.end,
    start: node.members.pos - 1
  };
}

function analyzeGap(gapText, context) {
  const length     = gapText.length;
  const allowComma = context === 'objectLiteral';
  let index = 0;
  let trailingCommentText = '';
  let prefixLines = null;

  while (index < length) {
    const code = gapText.charCodeAt(index);

    if (code === CHAR_NEWLINE) {
      break;
    }

    if (code === CHAR_SPACE || code === CHAR_TAB || (code === CHAR_COMMA && allowComma)) {
      index += 1;
      continue;
    }

    if (code === CHAR_SLASH && gapText.charCodeAt(index + 1) === CHAR_SLASH) {
      const commentStart = index;

      while (index < length && gapText.charCodeAt(index) !== CHAR_NEWLINE) {
        index += 1;
      }

      trailingCommentText = ` ${gapText.slice(commentStart, index).trimEnd()}`;
      break;
    }

    if (code === CHAR_SLASH && gapText.charCodeAt(index + 1) === CHAR_ASTERISK) {
      const commentEnd = gapText.indexOf('*/', index + 2);

      if (commentEnd === -1) {
        return null;
      }

      const commentText = gapText.slice(index, commentEnd + 2);

      if (commentText.includes('\n')) {
        return null;
      }

      trailingCommentText = ` ${commentText}`;
      index = commentEnd + 2;
      continue;
    }

    return null;
  }

  while (index < length && gapText.charCodeAt(index) !== CHAR_NEWLINE) {
    const code = gapText.charCodeAt(index);

    if (code === CHAR_SPACE || code === CHAR_TAB || (code === CHAR_COMMA && allowComma)) {
      index += 1;
      continue;
    }

    return null;
  }

  if (index < length && gapText.charCodeAt(index) === CHAR_NEWLINE) {
    index += 1;

    while (index < length) {
      while (index < length) {
        const code = gapText.charCodeAt(index);

        if (code !== CHAR_SPACE && code !== CHAR_TAB) {
          break;
        }

        index += 1;
      }

      if (index >= length) {
        break;
      }

      const code = gapText.charCodeAt(index);

      if (code === CHAR_NEWLINE) {
        (prefixLines ??= []).push('');
        index += 1;
        continue;
      }

      if (code === CHAR_SLASH && gapText.charCodeAt(index + 1) === CHAR_SLASH) {
        const commentStart = index;

        while (index < length && gapText.charCodeAt(index) !== CHAR_NEWLINE) {
          index += 1;
        }

        (prefixLines ??= []).push(gapText.slice(commentStart, index).trimEnd());

        if (index < length) {
          index += 1;
        }

        continue;
      }

      if (code === CHAR_SLASH && gapText.charCodeAt(index + 1) === CHAR_ASTERISK) {
        const commentEnd = gapText.indexOf('*/', index + 2);

        if (commentEnd === -1) {
          return null;
        }

        const commentText  = gapText.slice(index, commentEnd + 2);
        const commentLines = commentText.split('\n').map((line, lineIndex) => {
          return lineIndex === 0 ? line.trimEnd() : line.trim();
        });

        (prefixLines ??= []).push(...commentLines);
        index = commentEnd + 2;

        if (index < length && gapText.charCodeAt(index) === CHAR_NEWLINE) {
          index += 1;
        }

        continue;
      }

      return null;
    }
  } else if (index < length) {
    return null;
  }

  if (prefixLines === null) {
    return trailingCommentText === ''
      ? EMPTY_GAP_ANALYSIS
      : { prefixLines: EMPTY_PREFIX_LINES, trailingCommentText };
  }

  return { prefixLines, trailingCommentText };
}

function renderObjectLikeBlock(node, sourceFile, sourceText) {
  const context     = getObjectLikeContext(node);
  const members     = getObjectLikeMembers(node);
  const baseIndent  = getLineIndentAtPosition(sourceText, node.getStart(sourceFile));
  const memberInfos = [];
  let previousEnd   = getObjectBodyStart(node);

  for (let index = 0; index < members.length; index += 1) {
    const member      = members[index];
    const memberEnd   = getRenderableMemberEnd(member, context, sourceText);
    const gapAnalysis = analyzeGap(
      sourceText.slice(previousEnd, member.getStart(sourceFile)),
      context
    );

    if (gapAnalysis === null) {
      return null;
    }

    if (index > 0 && gapAnalysis.trailingCommentText !== '') {
      const previousInfo = memberInfos[index - 1];

      previousInfo.trailingCommentText = `${previousInfo.trailingCommentText ?? ''}${gapAnalysis.trailingCommentText}`;
    }

    const memberInfo = classifyMember(member, memberEnd, context, sourceFile, sourceText);

    memberInfo.prefixLines = gapAnalysis.prefixLines;
    memberInfos.push(memberInfo);
    previousEnd = memberEnd;
  }

  const trailingGapAnalysis = analyzeGap(
    sourceText.slice(previousEnd, getObjectBodyEnd(node, sourceText)),
    context
  );

  if (trailingGapAnalysis === null) {
    return null;
  }

  if (trailingGapAnalysis.trailingCommentText !== '') {
    const lastInfo = memberInfos[memberInfos.length - 1];

    lastInfo.trailingCommentText = `${lastInfo.trailingCommentText ?? ''}${trailingGapAnalysis.trailingCommentText}`;
  }

  const propertyInfos   = memberInfos.filter((memberInfo) => memberInfo.renderKind === 'aligned-property');
  const typeMethodInfos = memberInfos.filter((memberInfo) => memberInfo.renderKind === 'aligned-type-method');

  if (propertyInfos.length === 0 && typeMethodInfos.length === 0) {
    return null;
  }

  const propertyTargetLength    = choosePropertyTargetLength(propertyInfos, baseIndent);
  const typeMethodTargetLength  = chooseTypeMethodTargetLength(typeMethodInfos);
  const bodyParts               = [];

  for (let index = 0; index < memberInfos.length; index += 1) {
    const memberInfo     = memberInfos[index];
    const renderedMember = renderMemberInfo(memberInfo, {
      baseIndent              : baseIndent,
      context                 : context,
      isLast                  : index === memberInfos.length - 1,
      propertyTargetLength    : propertyTargetLength,
      typeMethodTargetLength  : typeMethodTargetLength
    });

    bodyParts.push(renderMemberChunk(memberInfo.prefixLines, renderedMember, baseIndent, index === 0));
  }

  const trailingCommentPrefixLines  = trimTrailingBlankLines(trailingGapAnalysis.prefixLines)
    .filter((line) => line !== '');
  const trailingPrefix              = renderPrefixLines(trailingCommentPrefixLines, baseIndent);
  const body                        = `${bodyParts.join('')}${trailingPrefix === '' ? '' : `\n${trailingPrefix}`}`;

  return `{\n${body}\n${baseIndent}}`;
}

function renderMemberChunk(prefixLines, renderedMember, baseIndent, isFirst) {
  if (prefixLines.length === 0) {
    return isFirst ? renderedMember : `\n${renderedMember}`;
  }

  let chunk = '';

  for (const line of prefixLines) {
    chunk += '\n';

    if (line !== '') {
      chunk += `${baseIndent}  ${line}`;
    }
  }

  chunk += `\n${renderedMember}`;

  return isFirst ? chunk.slice(1) : chunk;
}

function renderPrefixLines(prefixLines, baseIndent) {
  if (prefixLines.length === 0) {
    return '';
  }

  return prefixLines
    .map((line) => (line === '' ? '' : `${baseIndent}  ${line}`))
    .join('\n');
}

function trimTrailingBlankLines(lines) {
  const nextLines = [...lines];

  while (nextLines.length > 0 && nextLines[nextLines.length - 1] === '') {
    nextLines.pop();
  }

  return nextLines;
}

function classifyMember(member, memberEnd, context, sourceFile, sourceText) {
  if (context === 'objectLiteral') {
    const alignedObjectProperty = classifyObjectLiteralProperty(member, sourceFile, sourceText);

    if (alignedObjectProperty !== null) {
      return alignedObjectProperty;
    }

    return rawMemberInfo(member, memberEnd, sourceFile, sourceText);
  }

  const alignedTypeProperty = classifyTypeLiteralProperty(member, sourceFile, sourceText);

  if (alignedTypeProperty !== null) {
    return alignedTypeProperty;
  }

  const alignedTypeMethod = classifyTypeLiteralMethod(member, sourceFile, sourceText);

  if (alignedTypeMethod !== null) {
    return alignedTypeMethod;
  }

  if (context === 'classBody') {
    const alignedClassProperty = classifyClassProperty(member, memberEnd, sourceFile, sourceText);

    if (alignedClassProperty !== null) {
      return alignedClassProperty;
    }
  }

  return rawMemberInfo(member, memberEnd, sourceFile, sourceText);
}

function rawMemberInfo(member, memberEnd, sourceFile, sourceText) {
  return {
    rawText   : sourceText.slice(member.getStart(sourceFile), memberEnd),
    renderKind: 'raw'
  };
}

function classifyObjectLiteralProperty(member, sourceFile, sourceText) {
  if (ts.isPropertyAssignment(member)) {
    const keyText = getSimplePropertyNameText(member.name, sourceFile);

    if (keyText === null) {
      return null;
    }

    return {
      keyText     : keyText,
      renderKind  : 'aligned-property',
      valueText   : sourceText.slice(member.initializer.getStart(sourceFile), member.initializer.end)
    };
  }

  if (ts.isShorthandPropertyAssignment(member) && member.objectAssignmentInitializer === undefined) {
    const keyText = member.name.text;

    return {
      keyText     : keyText,
      renderKind  : 'aligned-property',
      valueText   : member.name.text
    };
  }

  return null;
}

function classifyTypeLiteralProperty(member, sourceFile, sourceText) {
  if (!ts.isPropertySignature(member) || member.type === undefined) {
    return null;
  }

  const nameText = getSimplePropertyNameText(member.name, sourceFile);

  if (nameText === null) {
    return null;
  }

  return {
    keyText             : `${hasReadonlyModifier(member) ? 'readonly ' : ''}${nameText}${member.questionToken ? '?' : ''}`,
    renderKind          : 'aligned-property',
    terminator          : ';',
    trailingCommentText : getSameLineTrailingCommentText(member, sourceText),
    valueText           : sourceText.slice(member.type.getStart(sourceFile), member.type.end)
  };
}

function classifyTypeLiteralMethod(member, sourceFile, sourceText) {
  if (!ts.isMethodSignature(member) || member.typeParameters !== undefined) {
    return null;
  }

  const nameText = getSimplePropertyNameText(member.name, sourceFile);

  if (nameText === null) {
    return null;
  }

  const parametersText = member.parameters
    .map((parameter) => sourceText.slice(parameter.getStart(sourceFile), parameter.end))
    .join(', ');
  const returnTypeText = member.type === undefined
    ? ''
    : `: ${sourceText.slice(member.type.getStart(sourceFile), member.type.end)}`;

  return {
    keyText     : `${nameText}${member.questionToken ? '?' : ''}`,
    renderKind  : 'aligned-type-method',
    suffixText  : `(${parametersText})${returnTypeText};`
  };
}

function classifyClassProperty(member, memberEnd, sourceFile, sourceText) {
  if (!ts.isPropertyDeclaration(member) || member.type === undefined) {
    return null;
  }

  if (member.decorators !== undefined) {
    return null;
  }

  const nameText = getSimplePropertyNameText(member.name, sourceFile);

  if (nameText === null) {
    return null;
  }

  if (
    member.initializer !== undefined
    && hasNewlineBetween(sourceText, member.initializer.getStart(sourceFile), member.initializer.end)
  ) {
    return null;
  }

  const valueEnd = member.initializer?.end ?? member.type.end;

  return {
    keyText             : `${getModifierPrefixText(member, sourceFile)}${nameText}${member.questionToken ? '?' : member.exclamationToken ? '!' : ''}`,
    renderKind          : 'aligned-property',
    terminator          : ';',
    trailingCommentText : sourceText.slice(member.getEnd(), memberEnd),
    valueText           : sourceText.slice(member.type.getStart(sourceFile), valueEnd)
  };
}

function hasReadonlyModifier(member) {
  return member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
}

function getModifierPrefixText(member, sourceFile) {
  if (member.modifiers === undefined || member.modifiers.length === 0) {
    return '';
  }

  return `${member.modifiers.map((modifier) => modifier.getText(sourceFile)).join(' ')} `;
}

function getSimplePropertyNameText(name, sourceFile) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.getText(sourceFile);
  }

  return null;
}

function choosePropertyTargetLength(propertyInfos, baseIndent) {
  if (propertyInfos.length === 0) {
    return null;
  }

  let maxLength = 0;

  for (const propertyInfo of propertyInfos) {
    if (propertyInfo.keyText.length > maxLength) {
      maxLength = propertyInfo.keyText.length;
    }
  }

  if (propertyInfos.length <= 2) {
    return maxLength;
  }

  const columnAfterLongestKey = baseIndent.length + 2 + maxLength + 1;

  return maxLength + (columnAfterLongestKey % 2 === 1 ? 2 : 1);
}

function chooseTypeMethodTargetLength(typeMethodInfos) {
  if (typeMethodInfos.length === 0) {
    return null;
  }

  let maxLength = 0;

  for (const typeMethodInfo of typeMethodInfos) {
    if (typeMethodInfo.keyText.length > maxLength) {
      maxLength = typeMethodInfo.keyText.length;
    }
  }

  if (typeMethodInfos.length === 1) {
    return maxLength;
  }

  return maxLength + 1;
}

function renderMemberInfo(memberInfo, options) {
  if (memberInfo.renderKind === 'aligned-property') {
    return renderAlignedProperty(memberInfo, options);
  }

  if (memberInfo.renderKind === 'aligned-type-method') {
    return renderAlignedTypeMethod(memberInfo, options);
  }

  return renderRawMember(memberInfo.rawText, options);
}

function renderAlignedProperty(memberInfo, options) {
  const paddingWidth        = Math.max(0, options.propertyTargetLength - memberInfo.keyText.length);
  const baseLine            = `${options.baseIndent}  ${memberInfo.keyText}${' '.repeat(paddingWidth)}: ${memberInfo.valueText}`;
  const trailingCommentText = memberInfo.trailingCommentText ?? '';

  if (options.context === 'objectLiteral') {
    const propertyLine = options.isLast ? baseLine : `${baseLine},`;

    return `${propertyLine}${trailingCommentText}`;
  }

  return `${baseLine}${memberInfo.terminator ?? ';'}${trailingCommentText}`;
}

function renderAlignedTypeMethod(memberInfo, options) {
  const paddingWidth = Math.max(0, options.typeMethodTargetLength - memberInfo.keyText.length);

  return `${options.baseIndent}  ${memberInfo.keyText}${' '.repeat(paddingWidth)}${memberInfo.suffixText}`;
}

function renderRawMember(rawText, options) {
  const prefixedText = prefixFirstLine(rawText, `${options.baseIndent}  `);

  if (options.context === 'objectLiteral' && !options.isLast) {
    return `${prefixedText},`;
  }

  return prefixedText;
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

function getRenderableMemberEnd(member, context, sourceText) {
  if (context === 'objectLiteral') {
    return member.end;
  }

  return getSameLineTrailingCommentEndPosition(sourceText, member.getEnd());
}

function getSameLineTrailingCommentText(member, sourceText) {
  return sourceText.slice(member.getEnd(), getSameLineTrailingCommentEndPosition(sourceText, member.getEnd()));
}

function getSameLineTrailingCommentEndPosition(sourceText, position) {
  const length = sourceText.length;
  let index = position;

  while (index < length) {
    const code = sourceText.charCodeAt(index);

    if (code !== CHAR_SPACE && code !== CHAR_TAB) {
      break;
    }

    index += 1;
  }

  if (sourceText.charCodeAt(index) === CHAR_SLASH && sourceText.charCodeAt(index + 1) === CHAR_SLASH) {
    while (index < length && sourceText.charCodeAt(index) !== CHAR_NEWLINE) {
      index += 1;
    }

    return index;
  }

  if (sourceText.charCodeAt(index) === CHAR_SLASH && sourceText.charCodeAt(index + 1) === CHAR_ASTERISK) {
    const commentEnd = sourceText.indexOf('*/', index + 2);

    if (commentEnd === -1) {
      return sourceText.length;
    }

    const newlineIndex = sourceText.indexOf('\n', index + 2);

    if (newlineIndex !== -1 && newlineIndex < commentEnd) {
      return position;
    }

    return commentEnd + 2;
  }

  return position;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
