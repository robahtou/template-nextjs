import { promises as fs } from 'node:fs';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';


const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT  = path.resolve(SCRIPT_DIRECTORY, '..', '..');

const BASELINE = Object.freeze({
  node              : '26.8.1',
  pnpm              : '11.24.0',
  packageManager    : 'pnpm@11.24.0+sha512.bd27e345e976dcb0be0b7a1228217b049a817e21b1f355c90dbe7dc46671895a8bc1e6d06c24554505ea93ea0b45f489a27ec1bfbc8de6a9659fca0f16fa0000',
  next              : '16.3.3',
  react             : '19.2.8',
  reactDom          : '19.2.8',
  typescript        : '7.0.2',
  typescriptBridge  : '6.0.2'
});

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readJson(filePath, errors, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label} could not be read as JSON: ${error.message}`);
    return undefined;
  }
}

async function readText(filePath, errors, label) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    errors.push(`${label} could not be read: ${error.message}`);
    return undefined;
  }
}

function expectEqual(errors, label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label} must be ${JSON.stringify(expected)}; found ${JSON.stringify(actual)}.`);
  }
}

function parseWorkspaceList(sourceText, key) {
  const lines       = sourceText.split(/\r\n|\n|\r/u);
  const headerIndex = lines.findIndex((line) => new RegExp(`^${key}:`, 'u').test(line));
  if (headerIndex === -1) {
    return [];
  }

  const headerValue = lines[headerIndex].slice(lines[headerIndex].indexOf(':') + 1).trim();
  if (headerValue.startsWith('[') && headerValue.endsWith(']')) {
    return headerValue
      .slice(1, -1)
      .split(',')
      .map((entry) => unquoteYamlScalar(entry))
      .filter(Boolean);
  }

  const values = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/u.test(line)) {
      break;
    }

    const match = /^\s+-\s+(.+?)\s*$/u.exec(line);
    if (match) {
      values.push(unquoteYamlScalar(match[1]));
    }
  }

  return values;
}

function parseLockImporters(lockText) {
  const lines           = lockText.split(/\r\n|\n|\r/u);
  const importersStart  = lines.findIndex((line) => line === 'importers:');
  const packagesStart   = lines.findIndex((line) => line === 'packages:');
  const importers       = new Map();

  if (importersStart === -1) {
    return importers;
  }

  const end = packagesStart === -1 ? lines.length : packagesStart;
  let importer;
  let section;
  let dependency;

  for (let index = importersStart + 1; index < end; index += 1) {
    const line = lines[index];
    let match = /^  ([^ ].*):\s*$/u.exec(line);
    if (match) {
      importer = unquoteYamlScalar(match[1]);
      importers.set(importer, new Map());
      section = undefined;
      dependency = undefined;
      continue;
    }

    match = /^    (dependencies|devDependencies|optionalDependencies):\s*$/u.exec(line);
    if (match && importer) {
      section = match[1];
      dependency = undefined;
      continue;
    }

    match = /^      (.+):\s*$/u.exec(line);
    if (match && importer && section) {
      dependency = unquoteYamlScalar(match[1]);
      importers.get(importer).set(`${section}:${dependency}`, {});
      continue;
    }

    match = /^        (specifier|version):\s*(.+?)\s*$/u.exec(line);
    if (match && importer && section && dependency) {
      importers.get(importer).get(`${section}:${dependency}`)[match[1]] = unquoteYamlScalar(match[2]);
    }
  }

  return importers;
}

function parseLockPackageKeys(lockText) {
  const lines           = lockText.split(/\r\n|\n|\r/u);
  const packagesStart   = lines.findIndex((line) => line === 'packages:');
  const snapshotsStart  = lines.findIndex((line) => line === 'snapshots:');
  const keys            = new Set();

  if (packagesStart === -1) {
    return keys;
  }

  const end = snapshotsStart === -1 ? lines.length : snapshotsStart;
  for (let index = packagesStart + 1; index < end; index += 1) {
    const match = /^  (.+):\s*$/u.exec(lines[index]);
    if (match) {
      keys.add(unquoteYamlScalar(match[1]));
    }
  }

  return keys;
}

function expectImporterSpecifier(errors, importers, importer, section, dependency, version) {
  const record = importers.get(importer)?.get(`${section}:${dependency}`);
  if (!record) {
    errors.push(`pnpm-lock.yaml is missing ${importer} ${section}.${dependency}.`);
    return;
  }

  expectEqual(
    errors,
    `pnpm-lock.yaml ${importer} ${section}.${dependency} specifier`,
    record.specifier,
    version,
  );

  if (
    typeof record.version !== 'string'
    || (
      record.version !== version
      && !record.version.startsWith(`${version}(`)
    )
  ) {
    errors.push(
      `pnpm-lock.yaml ${importer} ${section}.${dependency} resolved version must be ${version}; `
      + `found ${JSON.stringify(record.version)}.`,
    );
  }
}

function nextPackageNameFromLockKey(lockKey) {
  if (lockKey.startsWith('@next/')) {
    const separator = lockKey.indexOf('@', 1);
    return separator === -1 ? lockKey : lockKey.slice(0, separator);
  }

  if (lockKey.startsWith('next@')) {
    return 'next';
  }

  return undefined;
}

async function validateDependencyBaseline(repositoryRoot = REPOSITORY_ROOT) {
  const rootPath = path.resolve(repositoryRoot);
  const errors   = [];

  const [
    manifest,
    toolingManifest,
    workspaceText,
    lockText,
    installedNext,
    installedReact,
    installedReactDom,
    installedTypeScript,
    installedTypeScriptBridge,
  ] = await Promise.all([
    readJson(path.join(rootPath, 'package.json'), errors, 'package.json'),
    readJson(
      path.join(rootPath, 'tooling/code-style/package.json'),
      errors,
      'tooling/code-style/package.json',
    ),
    readText(path.join(rootPath, 'pnpm-workspace.yaml'), errors, 'pnpm-workspace.yaml'),
    readText(path.join(rootPath, 'pnpm-lock.yaml'), errors, 'pnpm-lock.yaml'),
    readJson(path.join(rootPath, 'node_modules/next/package.json'), errors, 'installed next'),
    readJson(path.join(rootPath, 'node_modules/react/package.json'), errors, 'installed react'),
    readJson(path.join(rootPath, 'node_modules/react-dom/package.json'), errors, 'installed react-dom'),
    readJson(path.join(rootPath, 'node_modules/typescript/package.json'), errors, 'installed TypeScript'),
    readJson(
      path.join(rootPath, 'tooling/code-style/node_modules/@typescript/typescript6/package.json'),
      errors,
      'installed TypeScript 6 bridge',
    ),
  ]);

  if (manifest) {
    expectEqual(errors, 'package.json engines.node', manifest.engines?.node, BASELINE.node);
    expectEqual(errors, 'package.json devEngines.runtime.name', manifest.devEngines?.runtime?.name, 'node');
    expectEqual(
      errors,
      'package.json devEngines.runtime.version',
      manifest.devEngines?.runtime?.version,
      BASELINE.node,
    );
    expectEqual(
      errors,
      'package.json devEngines.runtime.onFail',
      manifest.devEngines?.runtime?.onFail,
      'download',
    );
    expectEqual(
      errors,
      'package.json packageManager',
      manifest.packageManager,
      BASELINE.packageManager,
    );
    expectEqual(errors, 'package.json dependencies.next', manifest.dependencies?.next, BASELINE.next);
    expectEqual(errors, 'package.json dependencies.react', manifest.dependencies?.react, BASELINE.react);
    expectEqual(
      errors,
      'package.json dependencies.react-dom',
      manifest.dependencies?.['react-dom'],
      BASELINE.reactDom,
    );
    expectEqual(
      errors,
      'package.json devDependencies.typescript',
      manifest.devDependencies?.typescript,
      BASELINE.typescript,
    );

    if (manifest.dependencies?.typescript !== undefined) {
      errors.push('Native TypeScript must be a root devDependency, not a runtime dependency.');
    }

    const rootDependencySections = [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ];
    if (rootDependencySections.some(
      (section) => section?.['@typescript/typescript6'] !== undefined,
    )) {
      errors.push('The TypeScript 6 compatibility bridge must be declared only by tooling/code-style.');
    }
  }

  if (toolingManifest) {
    expectEqual(errors, 'tooling package name', toolingManifest.name, '@template/code-style');
    expectEqual(errors, 'tooling package private', toolingManifest.private, true);
    expectEqual(
      errors,
      'tooling TypeScript bridge dependency',
      toolingManifest.dependencies?.['@typescript/typescript6'],
      BASELINE.typescriptBridge,
    );

    const runtimeDependencies     = Object.keys(toolingManifest.dependencies ?? {});
    const unexpectedDependencies  = runtimeDependencies.filter(
      (dependency) => dependency !== '@typescript/typescript6',
    );
    const misplacedDependencies   = [
      ...Object.keys(toolingManifest.devDependencies ?? {}),
      ...Object.keys(toolingManifest.optionalDependencies ?? {}),
      ...Object.keys(toolingManifest.peerDependencies ?? {}),
    ];
    if (unexpectedDependencies.length > 0) {
      errors.push(
        `tooling/code-style may depend only on @typescript/typescript6; found ${
          unexpectedDependencies.join(', ')
        }.`,
      );
    }
    if (misplacedDependencies.length > 0) {
      errors.push(
        'tooling/code-style must keep all dependencies in dependencies and may not declare '
        + `dev/optional/peer dependencies; found ${misplacedDependencies.join(', ')}.`,
      );
    }
  }

  const installedPackages = [
    ['installed next', installedNext, 'next', BASELINE.next],
    ['installed react', installedReact, 'react', BASELINE.react],
    ['installed react-dom', installedReactDom, 'react-dom', BASELINE.reactDom],
    ['installed native TypeScript', installedTypeScript, 'typescript', BASELINE.typescript],
    [
      'installed TypeScript 6 bridge',
      installedTypeScriptBridge,
      '@typescript/typescript6',
      BASELINE.typescriptBridge,
    ],
  ];

  for (const [label, metadata, expectedName, expectedVersion] of installedPackages) {
    if (!metadata) {
      continue;
    }
    expectEqual(errors, `${label} package name`, metadata.name, expectedName);
    expectEqual(errors, `${label} version`, metadata.version, expectedVersion);
  }

  let expectedNextExclusions;
  if (installedNext) {
    expectEqual(
      errors,
      'installed next dependency @next/env',
      installedNext.dependencies?.['@next/env'],
      BASELINE.next,
    );

    const swcEntries = Object.entries(installedNext.optionalDependencies ?? {})
      .filter(([dependency]) => dependency.startsWith('@next/swc-'))
      .sort(([left], [right]) => left.localeCompare(right, 'en'));

    if (swcEntries.length === 0) {
      errors.push('installed next does not declare any @next/swc-* optional dependencies.');
    }

    for (const [dependency, version] of swcEntries) {
      expectEqual(errors, `installed next optional dependency ${dependency}`, version, BASELINE.next);
    }

    expectedNextExclusions = new Set([
      `next@${BASELINE.next}`,
      `@next/env@${BASELINE.next}`,
      ...swcEntries.map(([dependency]) => `${dependency}@${BASELINE.next}`),
    ]);
  }

  if (workspaceText !== undefined) {
    const workspacePackages = parseWorkspaceList(workspaceText, 'packages');
    if (!workspacePackages.includes('tooling/*')) {
      errors.push("pnpm-workspace.yaml packages must include 'tooling/*'.");
    }

    if (expectedNextExclusions) {
      const actualExclusions = new Set(parseWorkspaceList(workspaceText, 'minimumReleaseAgeExclude'));

      for (const expected of expectedNextExclusions) {
        if (!actualExclusions.has(expected)) {
          errors.push(`pnpm-workspace.yaml minimumReleaseAgeExclude is missing ${expected}.`);
        }
      }

      for (const actual of actualExclusions) {
        if (
          /^(?:next|@next\/(?:env|swc-[^@]+))@/u.test(actual)
          && !expectedNextExclusions.has(actual)
        ) {
          errors.push(`pnpm-workspace.yaml has an incoherent Next exclusion: ${actual}.`);
        }
      }
    }
  }

  if (lockText !== undefined) {
    const importers = parseLockImporters(lockText);
    expectImporterSpecifier(errors, importers, '.', 'dependencies', 'next', BASELINE.next);
    expectImporterSpecifier(errors, importers, '.', 'dependencies', 'react', BASELINE.react);
    expectImporterSpecifier(errors, importers, '.', 'dependencies', 'react-dom', BASELINE.reactDom);
    expectImporterSpecifier(
      errors,
      importers,
      '.',
      'devDependencies',
      'typescript',
      BASELINE.typescript,
    );
    expectImporterSpecifier(
      errors,
      importers,
      'tooling/code-style',
      'dependencies',
      '@typescript/typescript6',
      BASELINE.typescriptBridge,
    );

    for (const dependencyKey of importers.get('.')?.keys() ?? []) {
      if (dependencyKey.endsWith(':@typescript/typescript6')) {
        errors.push(
          'pnpm-lock.yaml root importer must not declare the TypeScript 6 compatibility bridge.',
        );
      }
    }

    const packageKeys         = parseLockPackageKeys(lockText);
    const expectedPackageKeys = new Set([
      `next@${BASELINE.next}`,
      `react@${BASELINE.react}`,
      `react-dom@${BASELINE.reactDom}`,
      `typescript@${BASELINE.typescript}`,
      `@typescript/typescript6@${BASELINE.typescriptBridge}`,
    ]);

    if (expectedNextExclusions) {
      for (const exclusion of expectedNextExclusions) {
        expectedPackageKeys.add(exclusion);
      }
    }

    for (const packageKey of expectedPackageKeys) {
      if (!packageKeys.has(packageKey)) {
        errors.push(`pnpm-lock.yaml packages is missing ${packageKey}.`);
      }
    }

    for (const packageKey of packageKeys) {
      const packageName = nextPackageNameFromLockKey(packageKey);
      if (
        packageName
        && /^(?:next|@next\/(?:env|swc-))/u.test(packageName)
        && !packageKey.endsWith(`@${BASELINE.next}`)
      ) {
        errors.push(`pnpm-lock.yaml contains a non-baseline Next package: ${packageKey}.`);
      }
    }
  }

  return errors;
}

async function main() {
  if (process.argv.length !== 2) {
    console.error('dependency-baseline: This checker does not accept arguments.');
    process.exitCode = 2;
    return;
  }

  const errors = await validateDependencyBaseline();
  for (const error of errors) {
    console.error(`dependency-baseline: ${error}`);
  }
  process.exitCode = errors.length === 0 ? 0 : 1;
}

function isMainModule(moduleUrl) {
  return process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}

if (isMainModule(import.meta.url)) {
  await main();
}

export {
  BASELINE,
  REPOSITORY_ROOT,
  parseLockImporters,
  parseLockPackageKeys,
  parseWorkspaceList,
  validateDependencyBaseline,
};
