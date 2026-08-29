import fs   from 'node:fs/promises';
import path from 'node:path';


const FILE_CONCURRENCY = 16;

const DEFAULT_IGNORED_DIRECTORIES         = new Set([
  '.agents',
  '.cache',
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
const DEFAULT_IGNORED_DIRECTORY_PREFIXES  = [
  '.fmt-file-'
];
const TYPESCRIPT_EXTENSIONS               = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx'
]);
const CSS_EXTENSIONS                      = new Set([
  '.css'
]);

function isMissingPathError(error) {
  return error !== null
    && typeof error === 'object'
    && ('code' in error)
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function isIgnoredDirectory(
  directoryName,
  ignoredDirectories,
  ignoredDirectoryPrefixes
) {
  if (ignoredDirectories.has(directoryName)) {
    return true;
  }

  for (const prefix of ignoredDirectoryPrefixes) {
    if (directoryName.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

function hasSupportedExtension(filePath, extensions) {
  return extensions.has(path.extname(filePath).toLowerCase());
}

async function mapWithConcurrency(items, concurrency, task) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Concurrency must be a positive integer.');
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const itemIndex = nextIndex;
      nextIndex += 1;
      results[itemIndex] = await task(items[itemIndex], itemIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers     = Array.from({ length: workerCount }, runWorker);

  await Promise.all(workers);
  return results;
}

async function inspectCandidate(candidate, extensions) {
  try {
    if (candidate.kind === 'directory') {
      return {
        kind      : 'directory',
        path      : candidate.path,
        realPath  : candidate.realPath
      };
    }

    const stats = await fs.stat(candidate.path);

    if (stats.isDirectory()) {
      return {
        kind      : 'directory',
        path      : candidate.path,
        realPath  : await fs.realpath(candidate.path)
      };
    }

    if (stats.isFile() && hasSupportedExtension(candidate.path, extensions)) {
      return {
        kind      : 'file',
        path      : candidate.path,
        realPath  : await fs.realpath(candidate.path)
      };
    }

    return null;
  } catch (error) {
    if (!candidate.required && isMissingPathError(error)) {
      return null;
    }

    throw new Error(`Unable to inspect target ${candidate.path}`, { cause: error });
  }
}

async function readDirectory(directory) {
  try {
    const entries = await fs.readdir(directory.path, { withFileTypes: true });
    entries.sort((left, right) => {
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
    });
    return entries;
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    throw new Error(`Unable to read directory ${directory.path}`, { cause: error });
  }
}

async function collectFiles(
  targets,
  extensions,
  {
    concurrency = FILE_CONCURRENCY,
    ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES,
    ignoredDirectoryPrefixes = DEFAULT_IGNORED_DIRECTORY_PREFIXES,
    workingDirectory = process.cwd()
  } = {}
) {
  const filesByRealPath        = new Map();
  const visitedRealDirectories = new Set();
  let pendingCandidates         = targets.map((target) => {
    return {
      kind      : 'unknown',
      path      : path.resolve(workingDirectory, target),
      required  : true
    };
  });

  while (pendingCandidates.length > 0) {
    const inspectedCandidates = await mapWithConcurrency(
      pendingCandidates,
      concurrency,
      (candidate) => inspectCandidate(candidate, extensions)
    );
    const directories         = [];

    for (const inspectedCandidate of inspectedCandidates) {
      if (inspectedCandidate === null) {
        continue;
      }

      if (inspectedCandidate.kind === 'file') {
        if (!filesByRealPath.has(inspectedCandidate.realPath)) {
          filesByRealPath.set(inspectedCandidate.realPath, inspectedCandidate.path);
        }
        continue;
      }

      if (!visitedRealDirectories.has(inspectedCandidate.realPath)) {
        visitedRealDirectories.add(inspectedCandidate.realPath);
        directories.push(inspectedCandidate);
      }
    }

    const directoryEntries = await mapWithConcurrency(
      directories,
      concurrency,
      readDirectory
    );
    const nextCandidates   = [];

    for (let directoryIndex = 0; directoryIndex < directories.length; directoryIndex += 1) {
      const directory = directories[directoryIndex];
      const entries   = directoryEntries[directoryIndex];

      for (const entry of entries) {
        if (
          isIgnoredDirectory(
            entry.name,
            ignoredDirectories,
            ignoredDirectoryPrefixes
          )
        ) {
          continue;
        }

        const entryPath = path.join(directory.path, entry.name);

        if (entry.isDirectory()) {
          nextCandidates.push({
            kind      : 'directory',
            path      : entryPath,
            realPath  : path.join(directory.realPath, entry.name),
            required  : false
          });
          continue;
        }

        if (entry.isFile()) {
          if (hasSupportedExtension(entryPath, extensions)) {
            const realEntryPath = path.join(directory.realPath, entry.name);

            if (!filesByRealPath.has(realEntryPath)) {
              filesByRealPath.set(realEntryPath, entryPath);
            }
          }
          continue;
        }

        if (entry.isSymbolicLink()) {
          // Explicit input targets may be links; links found during traversal are not followed.
          continue;
        }
      }
    }

    pendingCandidates = nextCandidates;
  }

  return Array.from(filesByRealPath.values()).sort((left, right) => {
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function isTypeScriptFile(filePath) {
  return hasSupportedExtension(filePath, TYPESCRIPT_EXTENSIONS);
}

function isCssFile(filePath) {
  return hasSupportedExtension(filePath, CSS_EXTENSIONS);
}


export {
  CSS_EXTENSIONS,
  DEFAULT_IGNORED_DIRECTORIES,
  DEFAULT_IGNORED_DIRECTORY_PREFIXES,
  FILE_CONCURRENCY,
  TYPESCRIPT_EXTENSIONS,
  collectFiles,
  isCssFile,
  isTypeScriptFile,
  mapWithConcurrency
};
