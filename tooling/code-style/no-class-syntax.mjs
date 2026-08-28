import fs       from 'node:fs/promises';
import path     from 'node:path';
import process  from 'node:process';
import ts       from '@typescript/typescript6';


const DEFAULT_TARGETS       = ['src'];
const IGNORED_DIRECTORIES   = new Set([
  '.agents',
  '.cache',
  '.claude',
  '.codex',
  '.cursor',
  '.dynamodb',
  '.entire',
  '.fusebox',
  '.git',
  '.grunt',
  '.next',
  '.next-bundle-budget',
  '.next-playwright',
  '.npm',
  '.nuxt',
  '.nyc_output',
  '.openchamber',
  '.opencode',
  '.parcel-cache',
  '.pnpm-staging-modules',
  '.pnpm-store',
  '.rpt2_cache',
  '.rts2_cache_cjs',
  '.rts2_cache_es',
  '.rts2_cache_umd',
  '.serverless',
  '.specstory',
  '.turbo',
  '.vercel',
  '.yarn',
  '_implementation',
  '_implementation_plans',
  '_monorepo_plans',
  'build',
  'coverage',
  'dist',
  'jspm_packages',
  'logs',
  'node_modules',
  'out',
  'pids',
  'playwright-report',
  'test-results',
  'web_modules'
]);
const SUPPORTED_EXTENSIONS  = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs'
]);

async function main() {
  const targets   = parseArgs(process.argv.slice(2));
  const files     = await collectFiles(targets.length > 0 ? targets : DEFAULT_TARGETS);
  const findings  = [];

  if (files.length === 0) {
    throw new Error('No supported TypeScript or JavaScript files found in the requested target(s).');
  }

  for (const filePath of files) {
    const sourceText = await fs.readFile(filePath, 'utf8');

    findings.push(...findClassSyntax(sourceText, filePath));
  }

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

async function collectFiles(targets) {
  const collected = new Set();

  for (const target of targets) {
    await walkPath(path.resolve(process.cwd(), target), collected, true);
  }

  return Array.from(collected).sort();
}

async function walkPath(targetPath, collected, followSymbolicLink = false) {
  let stats;

  try {
    stats = followSymbolicLink
      ? await fs.stat(targetPath)
      : await fs.lstat(targetPath);
  } catch (error) {
    const errorDetail = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(`Unable to inspect target ${targetPath}${errorDetail}`, { cause: error });
  }

  if (stats.isSymbolicLink()) return;

  if (stats.isDirectory()) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      await walkPath(path.join(targetPath, entry.name), collected);
    }
    return;
  }

  if (stats.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    collected.add(targetPath);
  }
}

function scriptKindFor(filePath) {
  const normalizedFilePath = filePath.toLowerCase();

  if (normalizedFilePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (normalizedFilePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (
    normalizedFilePath.endsWith('.js')
    || normalizedFilePath.endsWith('.mjs')
    || normalizedFilePath.endsWith('.cjs')
  ) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function findClassSyntax(sourceText, filePath = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    false,
    scriptKindFor(filePath)
  );
  const findings   = [];

  function visit(node) {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

      findings.push({
        filePath  : filePath,
        line      : position.line + 1,
        column    : position.character + 1
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

export { findClassSyntax };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
