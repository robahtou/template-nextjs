import fs             from 'node:fs/promises';
import path           from 'node:path';
import process        from 'node:process';

import {
  CSS_EXTENSIONS,
  FILE_CONCURRENCY,
  collectFiles,
  mapWithConcurrency
}                     from './file-discovery.mjs';


const DEFAULT_TARGETS = ['src'];

async function main() {
  const { fix, targets } = parseArgs(process.argv.slice(2));
  const files = await collectFiles(
    targets.length > 0 ? targets : DEFAULT_TARGETS,
    CSS_EXTENSIONS
  );

  if (files.length === 0) {
    console.log('No CSS files found.');
    return;
  }

  const changed      = await mapWithConcurrency(files, FILE_CONCURRENCY, async (filePath) => {
    const original  = await fs.readFile(filePath, 'utf8');
    const formatted = formatCssSource(original);

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
    console.log(`All ${files.length} file(s) already match the CSS formatting style.`);
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

  console.error(`Found ${changedFiles.length} file(s) with CSS formatting issues:`);
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

function formatCssSource(sourceText) {
  const normalized = sourceText.replace(/\r\n/g, '\n').trim();

  if (normalized.length === 0) {
    return sourceText.endsWith('\n') ? '\n' : '';
  }

  const formatted = renderItems(parseItems(normalized), 0).trimEnd();

  return `${formatted}\n`;
}

function parseItems(text) {
  return parseItemSequence(text, 0, false).items;
}

function parseItemSequence(text, startIndex, stopAtClosingBrace) {
  const items = [];
  let index = startIndex;

  while (index < text.length) {
    index = skipWhitespace(text, index);

    if (index >= text.length) {
      break;
    }

    if (text[index] === '}') {
      if (!stopAtClosingBrace) {
        throw new Error('Unexpected `}` in CSS file.');
      }

      return {
        end  : index + 1,
        items: items
      };
    }

    if (startsWithComment(text, index)) {
      const { comment, end } = readComment(text, index);
      items.push({ type: 'comment', text: comment });
      index = end;
      continue;
    }

    const result = readNextItem(text, index, stopAtClosingBrace);

    if (result.item !== null) {
      items.push(result.item);
    }

    index = result.end;

    if (result.closed) {
      return {
        end  : index,
        items: items
      };
    }
  }

  if (stopAtClosingBrace) {
    throw new Error('Unmatched `{` in CSS file.');
  }

  return {
    end  : index,
    items: items
  };
}

function createStatementItem(rawText, renderedText = rawText) {
  const text = normalizeInlineText(renderedText);

  if (text.length === 0) {
    return null;
  }

  return {
    type    : 'statement',
    rawText : rawText,
    text    : text
  };
}

function readNextItem(text, startIndex, stopAtClosingBrace) {
  let index = startIndex;
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = null;

  while (index < text.length) {
    if (startsWithComment(text, index)) {
      index = findCommentEnd(text, index);
      continue;
    }

    const char = text[index];

    if (stringQuote !== null) {
      if (char === '\\') {
        index += 2;
        continue;
      }

      if (char === stringQuote) {
        stringQuote = null;
      }

      index += 1;
      continue;
    }

    if (char === '"' || char === '\'') {
      stringQuote = char;
      index += 1;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      index += 1;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      index += 1;
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      index += 1;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      index += 1;
      continue;
    }

    if (parenDepth === 0 && bracketDepth === 0 && char === '{') {
      const header      = normalizeHeaderText(text.slice(startIndex, index));
      const parsedBlock = parseItemSequence(text, index + 1, true);

      return {
        closed  : false,
        end     : parsedBlock.end,
        item    : {
          type        : 'block',
          children    : parsedBlock.items,
          header      : header,
          selectorKey : selectorGroupKey(header)
        }
      };
    }

    if (parenDepth === 0 && bracketDepth === 0 && char === ';') {
      return {
        closed  : false,
        end     : index + 1,
        item    : createStatementItem(
          text.slice(startIndex, index),
          text.slice(startIndex, index + 1)
        )
      };
    }

    if (
      stopAtClosingBrace
      && parenDepth === 0
      && bracketDepth === 0
      && char === '}'
    ) {
      return {
        closed  : true,
        end     : index + 1,
        item    : createStatementItem(text.slice(startIndex, index))
      };
    }

    index += 1;
  }

  return {
    closed  : false,
    end     : text.length,
    item    : createStatementItem(text.slice(startIndex))
  };
}

function parseDeclarationChunk(chunk) {
  const normalizedChunk = chunk.trim();
  const colonIndex      = findFirstTopLevelColon(normalizedChunk);

  if (colonIndex === -1) {
    return {
      type: 'raw',
      text: normalizedChunk
    };
  }

  const property = normalizedChunk.slice(0, colonIndex).trim();
  const value    = normalizedChunk.slice(colonIndex + 1).trim();

  if (property.length === 0 || value.length === 0) {
    return {
      type: 'raw',
      text: normalizedChunk
    };
  }

  return {
    type      : 'declaration',
    property  : property,
    value     : normalizeDeclarationValue(value)
  };
}

function findFirstTopLevelColon(text) {
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = null;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (stringQuote !== null) {
      if (char === '\\') {
        index += 1;
        continue;
      }

      if (char === stringQuote) {
        stringQuote = null;
      }

      continue;
    }

    if (char === '"' || char === '\'') {
      stringQuote = char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (parenDepth === 0 && bracketDepth === 0 && char === ':') {
      return index;
    }
  }

  return -1;
}

function renderItems(items, depth) {
  if (items.length === 0) {
    return '';
  }

  const parts = [renderItem(items[0], depth)];

  for (let index = 1; index < items.length; index += 1) {
    const item         = items[index];
    const previousItem = items[index - 1];

    parts.push(separatorBetween(previousItem, item), renderItem(item, depth));
  }

  return parts.join('');
}

function renderItem(item, depth) {
  if (item.type === 'comment') {
    return renderComment(item.text, depth);
  }

  if (item.type === 'statement') {
    return `${indent(depth)}${item.text}`;
  }

  const childItems = item.children;

  if (childItems.every((childItem) => childItem.type !== 'block')) {
    return renderDeclarationBlock(item.header, childItems, depth);
  }

  return renderContainerBlock(item.header, childItems, depth);
}

function renderDeclarationBlock(header, items, depth) {
  const blockIndent         = indent(depth);
  const lineIndent          = indent(depth + 1);
  const declarations        = [];
  const parsedDeclarations  = new Array(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item.type === 'statement') {
      const declaration = parseDeclarationChunk(item.rawText);

      parsedDeclarations[index] = declaration;

      if (declaration.type === 'declaration') {
        declarations.push(declaration);
      }
    }
  }

  const targetLength  = declarations.length <= 1 ? null : getDeclarationTargetLength(declarations);
  const renderedLines = new Array(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item.type === 'comment') {
      renderedLines[index] = renderComment(item.text, depth + 1);
      continue;
    }

    const declaration = parsedDeclarations[index];

    if (declaration.type === 'raw') {
      renderedLines[index] = `${lineIndent}${ensureTrailingSemicolon(normalizeInlineText(declaration.text))}`;
      continue;
    }

    renderedLines[index] = `${lineIndent}${renderDeclaration(declaration, targetLength)}`;
  }

  if (renderedLines.length === 0) {
    return `${blockIndent}${header} {\n${blockIndent}}`;
  }

  return [
    `${blockIndent}${header} {`,
    ...renderedLines,
    `${blockIndent}}`
  ].join('\n');
}

function renderContainerBlock(header, childItems, depth) {
  const blockIndent = indent(depth);
  const body        = renderItems(childItems, depth + 1);

  if (body.length === 0) {
    return `${blockIndent}${header} {\n${blockIndent}}`;
  }

  return [
    `${blockIndent}${header} {`,
    body,
    `${blockIndent}}`
  ].join('\n');
}

function renderDeclaration(declaration, targetLength) {
  const property = declaration.property;
  const value    = declaration.value;

  if (targetLength === null) {
    return `${property}: ${value};`;
  }

  return `${property}${' '.repeat(targetLength - property.length)}: ${value};`;
}

function getDeclarationTargetLength(declarations) {
  let maxLength = 0;

  for (const declaration of declarations) {
    if (declaration.property.length > maxLength) {
      maxLength = declaration.property.length;
    }
  }

  return maxLength + (maxLength % 2 === 0 ? 2 : 1);
}

function normalizeDeclarationValue(value) {
  return value
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/#([0-9a-fA-F]{3,8})\b/g, (_, hex) => `#${hex.toLowerCase()}`)
    .trim();
}

function normalizeHeaderText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeInlineText(text) {
  return text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function ensureTrailingSemicolon(text) {
  return text.endsWith(';') ? text : `${text};`;
}

function renderComment(comment, depth) {
  const lines                     = comment.trim().split('\n');
  const continuationLines         = lines.slice(1);
  const nonEmptyContinuationLines = continuationLines.filter((line) => line.trim().length > 0);
  const commonIndentLength        = nonEmptyContinuationLines.length === 0
    ? 0
    : Math.min(...nonEmptyContinuationLines.map((line) => {
      return /^[\t ]*/u.exec(line)?.[0].length ?? 0;
    }));
  const commentIndent             = indent(depth);

  return lines
    .map((line, lineIndex) => {
      if (lineIndex === 0) {
        return `${commentIndent}${line.trimEnd()}`;
      }

      if (line.trim().length === 0) {
        return '';
      }

      return `${commentIndent} ${line.slice(commonIndentLength).trimEnd()}`;
    })
    .join('\n');
}

function separatorBetween(previousItem, nextItem) {
  if (previousItem.type === 'comment' || nextItem.type === 'comment') {
    return '\n';
  }

  if (shouldKeepAdjacent(previousItem, nextItem)) {
    return '\n';
  }

  return '\n\n';
}

function shouldKeepAdjacent(previousItem, nextItem) {
  if (previousItem.type !== 'block' || nextItem.type !== 'block') {
    return false;
  }

  return previousItem.selectorKey !== null
    && previousItem.selectorKey === nextItem.selectorKey;
}

function selectorGroupKey(header) {
  if (header.startsWith('@') || header.includes(',')) {
    return null;
  }

  let segmentEnd = header.length;

  while (segmentEnd > 0 && isSelectorSeparator(header.charCodeAt(segmentEnd - 1))) {
    segmentEnd -= 1;
  }

  if (segmentEnd === 0) {
    return null;
  }

  let segmentStart = segmentEnd - 1;

  while (segmentStart > 0 && !isSelectorSeparator(header.charCodeAt(segmentStart - 1))) {
    segmentStart -= 1;
  }

  let keyEnd = segmentStart;

  while (keyEnd < segmentEnd) {
    const code = header.charCodeAt(keyEnd);

    if (code === 58 || code === 91) {
      break;
    }

    keyEnd += 1;
  }

  return keyEnd === segmentStart
    ? null
    : header.slice(segmentStart, keyEnd);
}

function isSelectorSeparator(code) {
  return code === 9
    || code === 10
    || code === 12
    || code === 13
    || code === 32
    || code === 43
    || code === 62
    || code === 126;
}

function startsWithComment(text, index) {
  return text[index] === '/' && text[index + 1] === '*';
}

function readComment(text, startIndex) {
  const end = findCommentEnd(text, startIndex);

  return {
    comment: text.slice(startIndex, end),
    end    : end
  };
}

function findCommentEnd(text, startIndex) {
  const endIndex = text.indexOf('*/', startIndex + 2);

  return endIndex === -1 ? text.length : endIndex + 2;
}

function skipWhitespace(text, index) {
  while (index < text.length) {
    const code = text.charCodeAt(index);

    if (code !== 9 && code !== 10 && code !== 12 && code !== 13 && code !== 32) {
      break;
    }

    index += 1;
  }

  return index;
}

function indent(depth) {
  return '  '.repeat(depth);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}


export { formatCssSource };
