import fs       from 'node:fs/promises';
import path     from 'node:path';
import process  from 'node:process';


const DEFAULT_TARGETS       = ['src'];
const IGNORED_DIRECTORIES   = new Set([
  '.cursor',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'node_modules'
]);
const SUPPORTED_EXTENSIONS  = new Set(['.css']);

async function main() {
  const { fix, targets } = parseArgs(process.argv.slice(2));
  const files = await collectFiles(targets.length > 0 ? targets : DEFAULT_TARGETS);

  if (files.length === 0) {
    console.log('No CSS files found.');
    return;
  }

  const changedFiles = [];

  for (const filePath of files) {
    const original  = await fs.readFile(filePath, 'utf8');
    const formatted = formatCssSource(original);

    if (formatted === original) {
      continue;
    }

    changedFiles.push(filePath);

    if (fix) {
      await fs.writeFile(filePath, formatted, 'utf8');
    }
  }

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

async function collectFiles(targets) {
  const collected = new Set();

  for (const target of targets) {
    const resolvedTarget = path.resolve(process.cwd(), target);
    await walkPath(resolvedTarget, collected);
  }

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
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      await walkPath(path.join(targetPath, entry.name), collected);
    }

    return;
  }

  if (stats.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(targetPath))) {
    collected.add(targetPath);
  }
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
  const items = [];
  let index = 0;

  while (index < text.length) {
    index = skipWhitespace(text, index);

    if (index >= text.length) {
      break;
    }

    if (startsWithComment(text, index)) {
      const { comment, end } = readComment(text, index);
      items.push({ type: 'comment', text: comment });
      index = end;
      continue;
    }

    const result = readNextItem(text, index);

    if (result === null) {
      break;
    }

    items.push(result.item);
    index = result.end;
  }

  return items;
}

function readNextItem(text, startIndex) {
  let index = startIndex;
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = null;

  while (index < text.length) {
    if (startsWithComment(text, index)) {
      index = readComment(text, index).end;
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
      const header    = normalizeHeaderText(text.slice(startIndex, index));
      const blockEnd  = findMatchingBrace(text, index);
      const body      = text.slice(index + 1, blockEnd);

      return {
        end : blockEnd + 1,
        item: {
          type    : 'block',
          body    : body,
          header  : header
        }
      };
    }

    if (parenDepth === 0 && bracketDepth === 0 && char === ';') {
      const statement = normalizeInlineText(text.slice(startIndex, index + 1));

      return {
        end : index + 1,
        item: {
          type: 'statement',
          text: statement
        }
      };
    }

    index += 1;
  }

  const trailing = normalizeInlineText(text.slice(startIndex));

  if (trailing.length === 0) {
    return null;
  }

  return {
    end : text.length,
    item: {
      type: 'statement',
      text: trailing
    }
  };
}

function parseDeclarationItems(text) {
  const items = [];
  let index = 0;

  while (index < text.length) {
    index = skipWhitespace(text, index);

    if (index >= text.length) {
      break;
    }

    if (startsWithComment(text, index)) {
      const { comment, end } = readComment(text, index);
      items.push({ type: 'comment', text: comment });
      index = end;
      continue;
    }

    const result = readNextDeclaration(text, index);

    if (result === null) {
      break;
    }

    items.push(result.item);
    index = result.end;
  }

  return items;
}

function readNextDeclaration(text, startIndex) {
  let index = startIndex;
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = null;

  while (index < text.length) {
    if (startsWithComment(text, index)) {
      index = readComment(text, index).end;
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

    if (parenDepth === 0 && bracketDepth === 0 && char === ';') {
      return {
        end : index + 1,
        item: parseDeclarationChunk(text.slice(startIndex, index))
      };
    }

    index += 1;
  }

  const trailing = text.slice(startIndex).trim();

  if (trailing.length === 0) {
    return null;
  }

  return {
    end : text.length,
    item: parseDeclarationChunk(trailing)
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

  return items
    .map((item, index) => {
      const rendered = renderItem(item, depth);

      if (index === 0) {
        return rendered;
      }

      const previousItem = items[index - 1];

      return `${separatorBetween(previousItem, item)}${rendered}`;
    })
    .join('');
}

function renderItem(item, depth) {
  if (item.type === 'comment') {
    return renderComment(item.text, depth);
  }

  if (item.type === 'statement') {
    return `${indent(depth)}${item.text}`;
  }

  const childItems = parseItems(item.body);

  if (childItems.every((childItem) => childItem.type !== 'block')) {
    return renderDeclarationBlock(item.header, item.body, depth);
  }

  return renderContainerBlock(item.header, childItems, depth);
}

function renderDeclarationBlock(header, body, depth) {
  const blockIndent   = indent(depth);
  const lineIndent    = indent(depth + 1);
  const items         = parseDeclarationItems(body);
  const declarations  = items.filter((item) => item.type === 'declaration');
  const targetLength  = declarations.length <= 1 ? null : getDeclarationTargetLength(declarations);
  const renderedLines = items.map((item) => {
    if (item.type === 'comment') {
      return renderComment(item.text, depth + 1);
    }

    if (item.type === 'raw') {
      return `${lineIndent}${ensureTrailingSemicolon(normalizeInlineText(item.text))}`;
    }

    return `${lineIndent}${renderDeclaration(item, targetLength)}`;
  });

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
  const maxLength = Math.max(...declarations.map((declaration) => declaration.property.length));

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

  const previousKey = selectorGroupKey(previousItem.header);
  const nextKey     = selectorGroupKey(nextItem.header);

  return previousKey !== null && previousKey === nextKey;
}

function selectorGroupKey(header) {
  if (header.startsWith('@') || header.includes(',')) {
    return null;
  }

  const lastSegment = header
    .split(/[\s>+~]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .at(-1);

  if (lastSegment === undefined) {
    return null;
  }

  const match = lastSegment.match(/^([^:\[]+)/);

  return match?.[1] ?? null;
}

function findMatchingBrace(text, openingBraceIndex) {
  let depth = 0;
  let index = openingBraceIndex;
  let stringQuote = null;

  while (index < text.length) {
    if (startsWithComment(text, index)) {
      index = readComment(text, index).end;
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

    if (char === '{') {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }

      index += 1;
      continue;
    }

    index += 1;
  }

  throw new Error('Unmatched `{` in CSS file.');
}

function startsWithComment(text, index) {
  return text[index] === '/' && text[index + 1] === '*';
}

function readComment(text, startIndex) {
  const endIndex = text.indexOf('*/', startIndex + 2);

  if (endIndex === -1) {
    return {
      comment: text.slice(startIndex),
      end    : text.length
    };
  }

  return {
    comment: text.slice(startIndex, endIndex + 2),
    end    : endIndex + 2
  };
}

function skipWhitespace(text, index) {
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }

  return index;
}

function indent(depth) {
  return '  '.repeat(depth);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
