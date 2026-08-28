import { statSync }   from 'node:fs';
import path           from 'node:path';
import { spawnSync }  from 'node:child_process';
import process        from 'node:process';


const SCRIPT_DIR = import.meta.dirname;

const TYPESCRIPT_FORMATTER_SCRIPTS  = [
  `${SCRIPT_DIR}/typescript-import-layout.mjs`,
  `${SCRIPT_DIR}/typescript-object-layout.mjs`,
  `${SCRIPT_DIR}/typescript-parameter-layout.mjs`,
  `${SCRIPT_DIR}/typescript-const-layout.mjs`
];
const CSS_FORMATTER_SCRIPTS         = [`${SCRIPT_DIR}/css-formatting.mjs`];
const TYPESCRIPT_EXTENSIONS         = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function main() {
  const target = parseTarget(process.argv.slice(2));

  if (target === null) {
    console.error('Missing target. Run `pnpm fmt:file --file <path>`.');
    process.exitCode = 1;
    return;
  }

  const formatterScripts = resolveFormatterScripts(target);

  for (const scriptPath of formatterScripts) {
    const result = spawnSync(process.execPath, [scriptPath, '--fix', target], {
      stdio: 'inherit'
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

function parseTarget(argv) {
  const envTarget = process.env.npm_config_file;
  let target = envTarget !== undefined && envTarget.length > 0 ? envTarget : null;

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

      if (target === null) {
        target = nextArg;
      }

      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (target === null) {
      target = arg;
    }
  }

  return target;
}

function resolveFormatterScripts(target) {
  const resolvedTarget = path.resolve(process.cwd(), target);
  let targetStats;

  try {
    targetStats = statSync(resolvedTarget);
  } catch (error) {
    throw new Error(`Target not found: ${resolvedTarget}`, { cause: error });
  }

  if (targetStats.isDirectory()) {
    return [
      ...TYPESCRIPT_FORMATTER_SCRIPTS,
      ...CSS_FORMATTER_SCRIPTS
    ];
  }

  const extension = path.extname(resolvedTarget).toLowerCase();

  if (extension === '.css') {
    return CSS_FORMATTER_SCRIPTS;
  }

  if (TYPESCRIPT_EXTENSIONS.has(extension)) {
    return TYPESCRIPT_FORMATTER_SCRIPTS;
  }

  throw new Error(`Unsupported file extension for fmt:file: ${extension || '(none)'}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
