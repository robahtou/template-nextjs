import { promises as fs } from 'node:fs';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';


const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT  = path.resolve(SCRIPT_DIRECTORY, '..', '..');

const CONTEXT_ROOTS = Object.freeze([
  'docs',
  'src',
  'scripts/lint',
  'tooling/code-style',
]);

const EXCLUDED_DIRECTORIES = new Set([
  '.agents',
  '.cursor',
  '.git',
  '.next',
  '.turbo',
  '__fixtures__',
  '_implementation_plans',
  '_next_six_months',
  'build',
  'coverage',
  'dist',
  'fixtures',
  'node_modules',
  'out',
  'public',
  'test-fixtures',
]);

function detectEndOfLine(sourceText) {
  return sourceText.includes('\r\n') ? '\r\n' : '\n';
}

function isFenceStart(line) {
  const match = /^\s{0,3}(`{3,}|~{3,})/u.exec(line);
  return match?.[1];
}

function isFenceEnd(line, fence) {
  const markerCode = fence.charCodeAt(0);
  let index = 0;

  while (index < 3 && line.charCodeAt(index) === 32) {
    index += 1;
  }

  const markerStart = index;

  while (line.charCodeAt(index) === markerCode) {
    index += 1;
  }

  if (index - markerStart < fence.length) {
    return false;
  }

  while (index < line.length) {
    const code = line.charCodeAt(index);

    if (code !== 9 && code !== 32) {
      return false;
    }

    index += 1;
  }

  return true;
}

function isStructuralLine(line) {
  return (
    /^\s*$/u.test(line)
    || /^\s{0,3}#{1,6}(?:\s|$)/u.test(line)
    || /^\s{0,3}(?:[-*_]\s*){3,}$/u.test(line)
    || /^\s{0,3}(?:[-+*]|\d+[.)])\s+/u.test(line)
    || /^\s{0,3}>\s?/u.test(line)
    || /^(?: {4}|\t)/u.test(line)
    || /^\s{0,3}\[[^\]]+\]:\s*/u.test(line)
    || /^\s*(?:\||:?-{3,}:?\s*\|)/u.test(line)
    || /^\s{0,3}(?:<|:::)\/?[A-Za-z!]/u.test(line)
    || isFenceStart(line) !== undefined
  );
}

function hasHardBreak(line) {
  return /(?: {2,}|\\)$/u.test(line);
}

function unwrapPlainParagraph(lines, startIndex) {
  const firstLine = lines[startIndex];
  const indent    = /^[\t ]*/u.exec(firstLine)?.[0] ?? '';
  const parts     = [firstLine.trim()];
  let index = startIndex + 1;

  if (hasHardBreak(firstLine)) {
    return {
      lines    : [firstLine],
      nextIndex: index
    };
  }

  while (index < lines.length) {
    const line       = lines[index];
    const lineIndent = /^[\t ]*/u.exec(line)?.[0] ?? '';

    if (
      isStructuralLine(line)
      || lineIndent !== indent
      || hasHardBreak(lines[index - 1])
    ) {
      break;
    }

    parts.push(line.trim());
    index += 1;
  }

  return {
    lines    : [`${indent}${parts.join(' ')}`],
    nextIndex: index
  };
}

function unwrapListItem(lines, startIndex) {
  const firstLine = lines[startIndex];
  const match     = /^(\s{0,3}(?:[-+*]|\d+[.)])\s+)(.*)$/u.exec(firstLine);

  if (!match || hasHardBreak(firstLine)) {
    return {
      lines    : [firstLine],
      nextIndex: startIndex + 1
    };
  }

  const parts = [match[2].trim()];
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = lines[index];

    if (
      /^\s*$/u.test(line)
      || isFenceStart(line)
      || /^\s{0,3}(?:[-+*]|\d+[.)])\s+/u.test(line)
      || /^\s{0,3}(?:#{1,6}|>|\|)/u.test(line)
      || /^(?: {4}|\t)/u.test(line)
      || !/^\s+/u.test(line)
      || hasHardBreak(lines[index - 1])
    ) {
      break;
    }

    parts.push(line.trim());
    index += 1;
  }

  return {
    lines    : [`${match[1]}${parts.join(' ')}`],
    nextIndex: index
  };
}

function unwrapBlockquote(lines, startIndex) {
  const firstMatch = /^(\s{0,3}>\s?)(.*)$/u.exec(lines[startIndex]);

  if (!firstMatch || hasHardBreak(lines[startIndex])) {
    return {
      lines    : [lines[startIndex]],
      nextIndex: startIndex + 1
    };
  }

  const parts = [firstMatch[2].trim()];
  let index = startIndex + 1;

  while (index < lines.length) {
    const match = /^(\s{0,3}>\s?)(.*)$/u.exec(lines[index]);
    if (
      !match
      || match[1] !== firstMatch[1]
      || match[2] === ''
      || isStructuralLine(match[2])
      || hasHardBreak(lines[index - 1])
    ) {
      break;
    }

    parts.push(match[2].trim());
    index += 1;
  }

  return {
    lines    : [`${firstMatch[1]}${parts.join(' ')}`],
    nextIndex: index
  };
}

function formatContextMarkdown(sourceText) {
  if (sourceText === '') {
    return sourceText;
  }

  const endOfLine  = detectEndOfLine(sourceText);
  const inputLines = sourceText.split(/\r\n|\n|\r/u);
  while (inputLines.at(-1) === '') {
    inputLines.pop();
  }

  const outputLines = [];
  let index = 0;
  let fence;

  while (index < inputLines.length) {
    const line = inputLines[index];

    if (fence) {
      outputLines.push(line);
      if (isFenceEnd(line, fence)) {
        fence = undefined;
      }
      index += 1;
      continue;
    }

    const openingFence = isFenceStart(line);
    if (openingFence) {
      fence = openingFence;
      outputLines.push(line);
      index += 1;
      continue;
    }

    let result;
    if (/^\s{0,3}(?:[-+*]|\d+[.)])\s+/u.test(line)) {
      result = unwrapListItem(inputLines, index);
    } else if (/^\s{0,3}>\s?/u.test(line)) {
      result = unwrapBlockquote(inputLines, index);
    } else if (!isStructuralLine(line)) {
      result = unwrapPlainParagraph(inputLines, index);
    } else {
      result = {
        lines    : [line],
        nextIndex: index + 1
      };
    }

    outputLines.push(...result.lines);
    index = result.nextIndex;
  }

  return `${outputLines.join(endOfLine)}${endOfLine}`;
}

function isInside(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (
    relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
  );
}

async function collectContextFiles(repositoryRoot = REPOSITORY_ROOT) {
  const rootPath = path.resolve(repositoryRoot);
  const files    = [];

  async function visit(candidatePath) {
    if (!isInside(rootPath, candidatePath)) {
      throw new Error(`CONTEXT scan target is outside the repository: ${candidatePath}`);
    }

    const relativePath = path.relative(rootPath, candidatePath);
    if (
      relativePath
      && relativePath.split(path.sep).some((segment) => EXCLUDED_DIRECTORIES.has(segment))
    ) {
      return;
    }

    let entry;
    try {
      entry = await fs.lstat(candidatePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    if (entry.isSymbolicLink()) {
      return;
    }

    if (entry.isDirectory()) {
      const children = await fs.readdir(candidatePath, { withFileTypes: true });
      children.sort((left, right) => left.name.localeCompare(right.name, 'en'));
      for (const child of children) {
        await visit(path.join(candidatePath, child.name));
      }
      return;
    }

    if (entry.isFile() && path.basename(candidatePath) === 'CONTEXT.md') {
      files.push(candidatePath);
    }
  }

  for (const root of CONTEXT_ROOTS) {
    await visit(path.join(rootPath, root));
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function parseMode(argumentsList) {
  if (argumentsList.length !== 1 || !['--check', '--fix'].includes(argumentsList[0])) {
    throw new Error('Expected exactly one mode: --check or --fix.');
  }

  return argumentsList[0].slice(2);
}

async function runContextMarkdown(
  {
    argumentsList = process.argv.slice(2),
    repositoryRoot = REPOSITORY_ROOT,
  } = {}
) {
  let mode;
  try {
    mode = parseMode(argumentsList);
  } catch (error) {
    console.error(`context-md-prose-unwrap: ${error.message}`);
    return 2;
  }

  const files    = await collectContextFiles(repositoryRoot);
  const failures = [];

  for (const filePath of files) {
    const sourceText    = await fs.readFile(filePath, 'utf8');
    const formattedText = formatContextMarkdown(sourceText);
    if (sourceText === formattedText) {
      continue;
    }

    const displayPath = path.relative(repositoryRoot, filePath);
    if (mode === 'fix') {
      await fs.writeFile(filePath, formattedText, 'utf8');
      console.log(`context-md-prose-unwrap: fixed ${displayPath}`);
    } else {
      failures.push(`${displayPath} contains wrapped prose.`);
    }
  }

  for (const failure of failures) {
    console.error(`context-md-prose-unwrap: ${failure}`);
  }

  return failures.length === 0 ? 0 : 1;
}

function isMainModule(moduleUrl) {
  return process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}

if (isMainModule(import.meta.url)) {
  process.exitCode = await runContextMarkdown();
}

export {
  CONTEXT_ROOTS,
  REPOSITORY_ROOT,
  collectContextFiles,
  formatContextMarkdown,
  parseMode,
  runContextMarkdown,
};
