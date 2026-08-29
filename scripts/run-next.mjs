import { spawn }          from 'node:child_process';
import { once }           from 'node:events';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';


const BUILD_TIMEOUT_MILLISECONDS  = 20 * 60 * 1000;
const SCRIPT_DIRECTORY            = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT             = path.resolve(SCRIPT_DIRECTORY, '..');
const NEXT_CLI_PATH               = path.join(
  REPOSITORY_ROOT,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next'
);

async function runNext(argumentsList) {
  const timeout = argumentsList[0] === 'build'
    ? BUILD_TIMEOUT_MILLISECONDS
    : undefined;

  const child = spawn(
    process.execPath,
    [
      NEXT_CLI_PATH,
      ...argumentsList
    ],
    {
      cwd     : REPOSITORY_ROOT,
      env     : {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1'
      },
      shell   : false,
      stdio   : 'inherit',
      timeout : timeout
    }
  );
  const [
    code,
    signal
  ] = await once(child, 'exit');

  return {
    code  : code,
    signal: signal
  };
}

const argumentsList = process.argv.slice(2);

if (argumentsList.length === 0) {
  console.error('run-next: Expected a Next.js command.');
  process.exitCode = 2;
} else {
  try {
    const {
      code,
      signal
    } = await runNext(argumentsList);

    if (signal) {
      console.error(`run-next: Next.js exited after receiving ${signal}.`);
      process.exitCode = 1;
    } else {
      process.exitCode = code ?? 1;
    }
  } catch (error) {
    console.error('run-next: Failed to launch Next.js.', {
      cause: error
    });
    process.exitCode = 1;
  }
}
