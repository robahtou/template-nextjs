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
const MAX_FROM_COLUMN         = 57;

async function main() {
  const { fix, targets } = parseArgs(process.argv.slice(2));
  const files = await collectFiles(
    targets.length > 0 ? targets : await resolveDefaultTargets()
  );

  if (files.length === 0) {
    console.log('No supported files found.');
    return;
  }

  // Warnings collect per file so concurrent processing keeps deterministic output order.
  const results = await mapWithConcurrency(files, FILE_CONCURRENCY, async (filePath) => {
    const fileWarnings  = [];
    const original      = await fs.readFile(filePath, 'utf8');
    const formatted     = formatSourceText(original, filePath, fileWarnings);

    if (formatted === original) {
      return { changed: false, fileWarnings };
    }

    if (fix) {
      await fs.writeFile(filePath, formatted, 'utf8');
    }

    return { changed: true, fileWarnings };
  });

  const changedFiles = files.filter((filePath, fileIndex) => results[fileIndex].changed);

  for (const result of results) {
    for (const warning of result.fileWarnings) {
      console.warn(`warning: ${warning}`);
    }
  }

  if (changedFiles.length === 0) {
    console.log(`All ${files.length} file(s) already match the TypeScript import/re-export layout.`);
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

  console.error(`Found ${changedFiles.length} file(s) with TypeScript import/re-export layout issues:`);
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

export function formatSourceText(sourceText, filePath, warnings) {
  let nextText = normalizeLineEndings(sourceText);

  // Each stage needs an AST of the current text, so the parse is reused across stages and only
  // redone when a stage actually rewrote something. On already-formatted files this is one parse
  // instead of three.
  let sourceFile = createSourceFile(filePath, nextText);

  const importFormattedText = formatImportBlock(nextText, sourceFile, filePath, warnings);

  if (importFormattedText !== nextText) {
    nextText   = importFormattedText;
    sourceFile = createSourceFile(filePath, nextText);
  }

  const reExportFormattedText = formatNamedReExportBlocks(nextText, sourceFile);

  if (reExportFormattedText !== nextText) {
    nextText   = reExportFormattedText;
    sourceFile = createSourceFile(filePath, nextText);
  }

  nextText = formatBottomExportGroup(nextText, sourceFile);

  if (!nextText.endsWith('\n')) {
    nextText += '\n';
  }

  return nextText;
}

function normalizeLineEndings(sourceText) {
  return sourceText.replace(/\r\n/g, '\n');
}

function formatImportBlock(sourceText, sourceFile, filePath, warnings) {
  const importDeclarations = getTopImportDeclarations(sourceFile);

  if (importDeclarations.length === 0) {
    return sourceText;
  }

  const importInfos = importDeclarations.flatMap((declaration, index) => {
    const previousDeclaration = index === 0 ? null : importDeclarations[index - 1];

    return parseImportDeclarations(declaration, sourceFile).map((importInfo, importInfoIndex) => {
      return {
        ...importInfo,
        hasBlankLineBefore: importInfoIndex > 0
          ? false
          : previousDeclaration === null
            ? false
            : gapHasBlankLine(sourceText.slice(previousDeclaration.end, declaration.getStart(sourceFile)))
      };
    });
  });

  const serverOnlyImports             = importInfos.filter((importInfo) => importInfo.isServerOnly);
  const typeImports                   = importInfos.filter((importInfo) => importInfo.isTypeOnly);
  const regularImports                = importInfos.filter((importInfo) => !importInfo.isTypeOnly && !importInfo.isServerOnly);
  const targetFromColumn              = chooseTargetFromColumn(importInfos);
  const targetImportAttributesColumn  = chooseTargetImportAttributesColumn(importInfos, targetFromColumn);

  const renderedServerOnlyImports = renderImportGroup(serverOnlyImports, targetFromColumn, targetImportAttributesColumn, filePath, warnings);
  const renderedTypeImports       = renderImportGroup(typeImports, targetFromColumn, targetImportAttributesColumn, filePath, warnings);
  const renderedRegularImports    = renderImportGroup(regularImports, targetFromColumn, targetImportAttributesColumn, filePath, warnings);
  const importBlock               = joinRenderedImportGroups(
    renderedServerOnlyImports,
    renderedTypeImports,
    renderedRegularImports,
    typeImports.length + regularImports.length
  );

  const beforeImports = getTextBeforeImportBlock(sourceText, sourceFile, importDeclarations[0]);
  const afterImports  = trimLeadingBlankLines(sourceText.slice(importDeclarations.at(-1).end));

  if (afterImports.length === 0) {
    return `${beforeImports}${importBlock}\n`;
  }

  return `${beforeImports}${importBlock}\n\n\n${afterImports}`;
}

function formatNamedReExportBlocks(sourceText, sourceFile) {
  const reExportBlocks = getNamedReExportBlocks(sourceFile, sourceText);

  if (reExportBlocks.length === 0) {
    return sourceText;
  }

  // Blocks arrive in ascending, non-overlapping statement order, so one forward segment join
  // applies every rewrite without repeated string splicing.
  const parts = [];
  let cursor = 0;

  for (const block of reExportBlocks) {
    parts.push(
      sourceText.slice(cursor, block[0].getStart(sourceFile)),
      renderNamedReExportBlock(block, sourceFile, sourceText)
    );
    cursor = block.at(-1).end;
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

function getTopImportDeclarations(sourceFile) {
  const importDeclarations = [];
  let statementIndex = 0;

  while (
    statementIndex < sourceFile.statements.length
    && isDirectivePrologueStatement(sourceFile.statements[statementIndex])
  ) {
    statementIndex += 1;
  }

  for (; statementIndex < sourceFile.statements.length; statementIndex += 1) {
    const statement = sourceFile.statements[statementIndex];
    if (!ts.isImportDeclaration(statement)) {
      break;
    }

    importDeclarations.push(statement);
  }

  return importDeclarations;
}

function getTextBeforeImportBlock(sourceText, sourceFile, firstImportDeclaration) {
  const importBlockStart     = firstImportDeclaration.getStart(sourceFile);
  const directivePrologueEnd = getDirectivePrologueEnd(sourceFile);

  if (directivePrologueEnd === null) {
    return sourceText.slice(0, importBlockStart);
  }

  const textBetweenDirectivesAndImports = sourceText.slice(directivePrologueEnd, importBlockStart);

  if (textBetweenDirectivesAndImports.trim().length > 0) {
    return sourceText.slice(0, importBlockStart);
  }

  return `${sourceText.slice(0, directivePrologueEnd).trimEnd()}\n\n`;
}

function getDirectivePrologueEnd(sourceFile) {
  let directivePrologueEnd = null;

  for (const statement of sourceFile.statements) {
    if (!isDirectivePrologueStatement(statement)) {
      break;
    }

    directivePrologueEnd = statement.end;
  }

  return directivePrologueEnd;
}

function isDirectivePrologueStatement(statement) {
  return ts.isExpressionStatement(statement)
    && ts.isStringLiteral(statement.expression);
}

function getNamedReExportBlocks(sourceFile, sourceText) {
  const reExportBlocks = [];
  let currentBlock = [];

  for (const statement of sourceFile.statements) {
    if (!isNamedReExportDeclaration(statement)) {
      if (currentBlock.length > 0) {
        reExportBlocks.push(currentBlock);
        currentBlock = [];
      }

      continue;
    }

    if (currentBlock.length === 0) {
      currentBlock.push(statement);
      continue;
    }

    const previousStatement = currentBlock.at(-1);
    const gap               = sourceText.slice(previousStatement.end, statement.getStart(sourceFile));

    if (gap.trim().length > 0) {
      reExportBlocks.push(currentBlock);
      currentBlock = [statement];
      continue;
    }

    currentBlock.push(statement);
  }

  if (currentBlock.length > 0) {
    reExportBlocks.push(currentBlock);
  }

  return reExportBlocks;
}

function isNamedReExportDeclaration(statement) {
  return ts.isExportDeclaration(statement)
    && statement.moduleSpecifier !== undefined
    && statement.exportClause !== undefined
    && ts.isNamedExports(statement.exportClause);
}

function parseImportDeclarations(declaration, sourceFile) {
  const moduleSpecifierText = declaration.moduleSpecifier.text;
  const moduleSpecifier     = declaration.moduleSpecifier.getText(sourceFile);
  const importAttributes    = getImportAttributesText(declaration, sourceFile);
  const importClause        = declaration.importClause;

  if (!importClause) {
    return [{
      defaultImport       : null,
      importAttributes    : importAttributes,
      isSideEffect        : true,
      isServerOnly        : moduleSpecifierText === 'server-only',
      isTypeOnly          : false,
      moduleSpecifier     : moduleSpecifier,
      moduleSpecifierText : moduleSpecifierText,
      namedImports        : [],
      namespaceImport     : null
    }];
  }

  const namedBindings = importClause.namedBindings;
  const defaultImport = importClause.name?.text ?? null;

  if (namedBindings === undefined) {
    return [{
      defaultImport       : defaultImport,
      importAttributes    : importAttributes,
      isSideEffect        : false,
      isServerOnly        : false,
      isTypeOnly          : importClause.isTypeOnly,
      moduleSpecifier     : moduleSpecifier,
      moduleSpecifierText : moduleSpecifierText,
      namedImports        : [],
      namespaceImport     : null
    }];
  }

  if (ts.isNamespaceImport(namedBindings)) {
    return [{
      defaultImport       : defaultImport,
      importAttributes    : importAttributes,
      isSideEffect        : false,
      isServerOnly        : false,
      isTypeOnly          : importClause.isTypeOnly,
      moduleSpecifier     : moduleSpecifier,
      moduleSpecifierText : moduleSpecifierText,
      namedImports        : [],
      namespaceImport     : namedBindings.name.text
    }];
  }

  const typeNamedImports  = [];
  const valueNamedImports = [];

  for (const element of namedBindings.elements) {
    if (element.isTypeOnly || importClause.isTypeOnly) {
      typeNamedImports.push(renderImportSpecifier(element));
      continue;
    }

    valueNamedImports.push(renderImportSpecifier(element));
  }

  const parsedImports = [];

  if (typeNamedImports.length > 0) {
    parsedImports.push({
      defaultImport       : null,
      importAttributes    : importAttributes,
      isSideEffect        : false,
      isServerOnly        : false,
      isTypeOnly          : true,
      moduleSpecifier     : moduleSpecifier,
      moduleSpecifierText : moduleSpecifierText,
      namedImports        : typeNamedImports,
      namespaceImport     : null
    });
  }

  if (defaultImport !== null || valueNamedImports.length > 0 || (importClause.isTypeOnly && typeNamedImports.length === 0)) {
    parsedImports.push({
      defaultImport       : defaultImport,
      importAttributes    : importAttributes,
      isSideEffect        : false,
      isServerOnly        : false,
      isTypeOnly          : importClause.isTypeOnly && typeNamedImports.length === 0,
      moduleSpecifier     : moduleSpecifier,
      moduleSpecifierText : moduleSpecifierText,
      namedImports        : valueNamedImports,
      namespaceImport     : null
    });
  }

  return parsedImports;
}

function getImportAttributesText(declaration, sourceFile) {
  const importAttributes = declaration.attributes ?? declaration.assertClause;

  return importAttributes === undefined ? null : importAttributes.getText(sourceFile);
}

function parseNamedReExportDeclaration(declaration, sourceFile) {
  const exportClause = declaration.exportClause;

  if (exportClause === undefined || !ts.isNamedExports(exportClause) || declaration.moduleSpecifier === undefined) {
    throw new Error('Expected named re-export declaration.');
  }

  return {
    isTypeOnly      : declaration.isTypeOnly,
    moduleSpecifier : declaration.moduleSpecifier.getText(sourceFile),
    namedExports    : exportClause.elements.map((exportSpecifier) => {
      return renderExportSpecifier(exportSpecifier, declaration.isTypeOnly);
    })
  };
}

function renderImportSpecifier(importSpecifier) {
  const importedName = importSpecifier.propertyName !== undefined
    ? `${importSpecifier.propertyName.text} as ${importSpecifier.name.text}`
    : importSpecifier.name.text;

  return importedName;
}

function renderExportSpecifier(exportSpecifier, declarationIsTypeOnly) {
  const exportedName = exportSpecifier.propertyName !== undefined
    ? `${exportSpecifier.propertyName.text} as ${exportSpecifier.name.text}`
    : exportSpecifier.name.text;

  return !declarationIsTypeOnly && exportSpecifier.isTypeOnly
    ? `type ${exportedName}`
    : exportedName;
}

function chooseTargetFromColumn(importInfos) {
  const alignedImportInfos = importInfos.filter((importInfo) => !importInfo.isSideEffect);

  if (importInfos.length === 2 && alignedImportInfos.length === 2) {
    const candidateColumns = alignedImportInfos
      .map((importInfo) => getEffectiveFromColumn(importInfo, getTightInlineFromColumn))
      .filter((fromColumn) => fromColumn <= MAX_FROM_COLUMN);

    if (candidateColumns.length === 0) {
      return MAX_FROM_COLUMN;
    }

    return Math.max(...candidateColumns);
  }

  const candidateColumns = importInfos
    .filter((importInfo) => !importInfo.isSideEffect)
    .map((importInfo) => getEffectiveFromColumn(importInfo, getInlineFromColumn))
    .filter((fromColumn) => fromColumn <= MAX_FROM_COLUMN);

  if (candidateColumns.length === 0) {
    return importInfos.some((importInfo) => !importInfo.isSideEffect) ? MAX_FROM_COLUMN : null;
  }

  return Math.max(...candidateColumns);
}

function getEffectiveFromColumn(importInfo, getPreferredInlineFromColumn) {
  const inlineFromColumn = getPreferredInlineFromColumn(importInfo);

  if (inlineFromColumn <= MAX_FROM_COLUMN || importInfo.namedImports.length === 0) {
    return inlineFromColumn;
  }

  // An import that must wrap anchors on its stacked specifier lines instead of pushing the
  // whole block to the column cap.
  return getMultilineFromColumn(importInfo.namedImports);
}

function getTightInlineFromColumn(importInfo) {
  const inlinePrefix = buildInlineImportPrefix(importInfo);

  return inlinePrefix.length + 2;
}

function getInlineFromColumn(importInfo) {
  const inlinePrefix = buildInlineImportPrefix(importInfo);

  return getFromColumnForPrefix(inlinePrefix);
}

function buildInlineImportPrefix(importInfo) {
  const importKeyword = importInfo.isTypeOnly ? 'import type' : 'import';

  if (importInfo.isSideEffect) {
    return importKeyword;
  }

  const bindingParts = [];

  if (importInfo.defaultImport !== null) {
    bindingParts.push(importInfo.defaultImport);
  }

  if (importInfo.namespaceImport !== null) {
    bindingParts.push(`* as ${importInfo.namespaceImport}`);
  }

  if (importInfo.namedImports.length > 0) {
    bindingParts.push(`{ ${importInfo.namedImports.join(', ')} }`);
  }

  return `${importKeyword} ${bindingParts.join(', ')}`;
}

function getInlineReExportFromColumn(exportInfo) {
  const inlinePrefix = buildInlineReExportPrefix(exportInfo);

  return getFromColumnForPrefix(inlinePrefix);
}

function getFromColumnForPrefix(prefix) {
  return getFromColumnAfterLineLength(prefix.length);
}

function getFromColumnAfterLineLength(lineLength) {
  // The cursor column right after the line decides the gap: odd cursor gets two spaces, even
  // cursor gets one, so `from` always lands on an odd column.
  const cursorColumn = lineLength + 1;

  return cursorColumn % 2 === 0 ? cursorColumn + 1 : cursorColumn + 2;
}

function getMultilineFromColumn(stackedNames) {
  const longestLineLength = Math.max(
    ...buildStackedNameLines(stackedNames).map((line) => line.length)
  );

  return getFromColumnAfterLineLength(longestLineLength);
}

function buildStackedNameLines(stackedNames) {
  return stackedNames.map((stackedName, index) => {
    const suffix = index < stackedNames.length - 1 ? ',' : '';

    return `  ${stackedName}${suffix}`;
  });
}

function buildInlineReExportPrefix(exportInfo) {
  const exportKeyword = exportInfo.isTypeOnly ? 'export type' : 'export';

  return `${exportKeyword} { ${exportInfo.namedExports.join(', ')} }`;
}

function chooseTargetImportAttributesColumn(importInfos, targetFromColumn) {
  const candidateColumns = importInfos
    .filter((importInfo) => importInfo.importAttributes !== null && !importInfo.isSideEffect)
    .map((importInfo) => getInlineImportAttributesColumn(importInfo, targetFromColumn));

  if (candidateColumns.length === 0) {
    return null;
  }

  return Math.max(...candidateColumns);
}

function getInlineImportAttributesColumn(importInfo, targetFromColumn) {
  const inlinePrefix = buildInlineImportPrefix(importInfo);
  const fromClause   = renderImportFromClause(inlinePrefix, importInfo.moduleSpecifier, targetFromColumn);

  return fromClause.length + 2;
}

function renderImportGroup(importInfos, targetFromColumn, targetImportAttributesColumn, filePath, warnings) {
  if (importInfos.length === 0) {
    return '';
  }

  return importInfos
    .map((importInfo, index) => {
      const renderedImport = renderImport(importInfo, targetFromColumn, targetImportAttributesColumn, filePath, warnings);

      if (index === 0) {
        return renderedImport;
      }

      return `${importInfo.hasBlankLineBefore ? '\n\n' : '\n'}${renderedImport}`;
    })
    .join('');
}

function renderImport(importInfo, targetFromColumn, targetImportAttributesColumn, filePath, warnings) {
  if (importInfo.isSideEffect) {
    return renderSideEffectImport(importInfo);
  }

  const inlinePrefix     = buildInlineImportPrefix(importInfo);
  const inlineFromColumn = getInlineFromColumn(importInfo);

  if (inlineFromColumn <= MAX_FROM_COLUMN) {
    return renderInlineImport(inlinePrefix, importInfo, targetFromColumn, targetImportAttributesColumn);
  }

  if (importInfo.namedImports.length > 0) {
    return renderMultilineNamedImport(importInfo, targetFromColumn, targetImportAttributesColumn);
  }

  warnings.push([
    path.relative(process.cwd(), filePath),
    'contains an import that exceeds the column cap and cannot be wrapped automatically:',
    `${inlinePrefix} from ${importInfo.moduleSpecifier};`
  ].join(' '));

  return `${inlinePrefix} from ${importInfo.moduleSpecifier};`;
}

function renderNamedReExportBlock(block, sourceFile, sourceText) {
  const exportInfos      = block.map((declaration, index) => {
    const previousDeclaration = index === 0 ? null : block[index - 1];

    return {
      ...parseNamedReExportDeclaration(declaration, sourceFile),
      hasBlankLineBefore: previousDeclaration === null
        ? false
        : gapHasBlankLine(sourceText.slice(previousDeclaration.end, declaration.getStart(sourceFile)))
    };
  });
  const targetFromColumn = chooseNamedReExportTargetFromColumn(exportInfos);

  return exportInfos
    .map((exportInfo, index) => {
      const renderedReExport = renderNamedReExport(exportInfo, targetFromColumn);

      if (index === 0) {
        return renderedReExport;
      }

      return `${exportInfo.hasBlankLineBefore ? '\n\n' : '\n'}${renderedReExport}`;
    })
    .join('');
}

function chooseNamedReExportTargetFromColumn(exportInfos) {
  const candidateColumns = exportInfos
    .map((exportInfo) => {
      const inlineFromColumn = getInlineReExportFromColumn(exportInfo);

      return inlineFromColumn <= MAX_FROM_COLUMN
        ? inlineFromColumn
        : getMultilineFromColumn(exportInfo.namedExports);
    })
    .filter((fromColumn) => fromColumn <= MAX_FROM_COLUMN);

  if (candidateColumns.length === 0) {
    return MAX_FROM_COLUMN;
  }

  return Math.max(...candidateColumns);
}

function renderNamedReExport(exportInfo, targetFromColumn) {
  const inlinePrefix     = buildInlineReExportPrefix(exportInfo);
  const inlineFromColumn = getInlineReExportFromColumn(exportInfo);

  if (inlineFromColumn <= MAX_FROM_COLUMN) {
    return renderAlignedInlineFromClause(inlinePrefix, exportInfo.moduleSpecifier, targetFromColumn);
  }

  return renderMultilineNamedReExport(exportInfo, targetFromColumn);
}

function renderAlignedInlineFromClause(inlinePrefix, moduleSpecifier, targetFromColumn) {
  const fromClause = renderImportFromClause(inlinePrefix, moduleSpecifier, targetFromColumn);

  return `${fromClause};`;
}

function renderImportFromClause(inlinePrefix, moduleSpecifier, targetFromColumn) {
  const paddingWidth = Math.max(1, targetFromColumn - (inlinePrefix.length + 1));

  return `${inlinePrefix}${' '.repeat(paddingWidth)}from ${moduleSpecifier}`;
}

function renderSideEffectImport(importInfo) {
  const importAttributes = importInfo.importAttributes === null ? '' : ` ${importInfo.importAttributes}`;

  return `import ${importInfo.moduleSpecifier}${importAttributes};`;
}

function renderInlineImport(inlinePrefix, importInfo, targetFromColumn, targetImportAttributesColumn) {
  const fromClause = renderImportFromClause(inlinePrefix, importInfo.moduleSpecifier, targetFromColumn);

  return renderImportWithAttributes(fromClause, importInfo.importAttributes, targetImportAttributesColumn);
}

function renderImportWithAttributes(fromClause, importAttributes, targetImportAttributesColumn) {
  if (importAttributes === null) {
    return `${fromClause};`;
  }

  const paddingWidth = targetImportAttributesColumn === null
    ? 1
    : Math.max(1, targetImportAttributesColumn - (fromClause.length + 1));

  return `${fromClause}${' '.repeat(paddingWidth)}${importAttributes};`;
}

function renderMultilineNamedImport(importInfo, targetFromColumn, targetImportAttributesColumn) {
  const importKeyword     = importInfo.isTypeOnly ? 'import type' : 'import';
  const openingLine       = importInfo.defaultImport !== null
    ? `${importKeyword} ${importInfo.defaultImport}, {`
    : `${importKeyword} {`;
  const namedImportLines  = buildStackedNameLines(importInfo.namedImports);
  const closingFromClause = renderImportFromClause('}', importInfo.moduleSpecifier, targetFromColumn);
  const closingLine       = renderImportWithAttributes(closingFromClause, importInfo.importAttributes, targetImportAttributesColumn);

  return [
    openingLine,
    ...namedImportLines,
    closingLine
  ].join('\n');
}

function renderMultilineNamedReExport(exportInfo, targetFromColumn) {
  const exportKeyword     = exportInfo.isTypeOnly ? 'export type' : 'export';
  const namedExportLines  = buildStackedNameLines(exportInfo.namedExports);
  const closingLine       = renderAlignedInlineFromClause('}', exportInfo.moduleSpecifier, targetFromColumn);

  return [
    `${exportKeyword} {`,
    ...namedExportLines,
    closingLine
  ].join('\n');
}

function joinRenderedImportGroups(
  renderedServerOnlyImports,
  renderedTypeImports,
  renderedRegularImports,
  nonServerOnlyImportCount
) {
  const renderedTypeAndRegularImports = joinRenderedTypeAndRegularImports(
    renderedTypeImports,
    renderedRegularImports,
    nonServerOnlyImportCount
  );

  if (renderedServerOnlyImports.length > 0 && renderedTypeAndRegularImports.length > 0) {
    return `${renderedServerOnlyImports}\n\n${renderedTypeAndRegularImports}`;
  }

  if (renderedServerOnlyImports.length > 0) {
    return renderedServerOnlyImports;
  }

  return renderedTypeAndRegularImports;
}

function joinRenderedTypeAndRegularImports(renderedTypeImports, renderedRegularImports, importCount) {
  if (renderedTypeImports.length > 0 && renderedRegularImports.length > 0) {
    return importCount >= 4
      ? `${renderedTypeImports}\n\n${renderedRegularImports}`
      : `${renderedTypeImports}\n${renderedRegularImports}`;
  }

  return renderedTypeImports.length > 0 ? renderedTypeImports : renderedRegularImports;
}

function formatBottomExportGroup(sourceText, sourceFile) {
  const exportGroup = getTrailingBottomExportGroup(sourceFile);

  if (exportGroup.length === 0) {
    return sourceText;
  }

  const hasDefaultExport = exportGroup.some((statement) => {
    return ts.isExportAssignment(statement) && !statement.isExportEquals;
  });

  if (!hasDefaultExport) {
    return sourceText;
  }

  const exportText        = exportGroup
    .map((statement) => sourceText.slice(statement.getStart(sourceFile), statement.end).trimEnd())
    .join('\n');
  const beforeExportGroup = sourceText.slice(0, exportGroup[0].getStart(sourceFile)).replace(/\s*$/, '');

  if (beforeExportGroup.length === 0) {
    return `${exportText}\n`;
  }

  return `${beforeExportGroup}\n\n\n${exportText}\n`;
}

function getTrailingBottomExportGroup(sourceFile) {
  const exportGroup = [];

  for (let index = sourceFile.statements.length - 1; index >= 0; index -= 1) {
    const statement = sourceFile.statements[index];

    if (!isBottomExportStatement(statement)) {
      break;
    }

    exportGroup.unshift(statement);
  }

  return exportGroup;
}

function isBottomExportStatement(statement) {
  return (ts.isExportAssignment(statement) && !statement.isExportEquals)
    || ts.isExportDeclaration(statement);
}

function gapHasBlankLine(text) {
  return /\n[ \t]*\n/.test(text);
}

function trimLeadingBlankLines(text) {
  return text.replace(/^(?:[ \t]*\n)*/, '');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
