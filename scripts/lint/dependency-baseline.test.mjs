import assert                                   from 'node:assert/strict';
import { promises as fs }                       from 'node:fs';
import os                                       from 'node:os';
import path                                     from 'node:path';
import test                                     from 'node:test';
import { BASELINE, validateDependencyBaseline } from './dependency-baseline.mjs';


const SWC_PACKAGES = [
  '@next/swc-darwin-arm64',
  '@next/swc-linux-x64-gnu',
];

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createValidFixture(context) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dependency-baseline-'));
  context.after(() => fs.rm(root, { force: true, recursive: true }));

  await writeJson(path.join(root, 'package.json'), {
    name            : 'template-nextjs',
    private         : true,
    engines         : {
      node: BASELINE.node
    },
    devEngines      : {
      runtime: {
        name    : 'node',
        version : BASELINE.node,
        onFail  : 'download'
      }
    },
    packageManager  : BASELINE.packageManager,
    dependencies    : {
      next        : BASELINE.next,
      react       : BASELINE.react,
      'react-dom' : BASELINE.reactDom
    },
    devDependencies : {
      typescript: BASELINE.typescript
    }
  });

  await writeJson(path.join(root, 'tooling/code-style/package.json'), {
    name          : '@template/code-style',
    private       : true,
    type          : 'module',
    dependencies  : {
      '@typescript/typescript6': BASELINE.typescriptBridge
    }
  });

  await fs.writeFile(path.join(root, 'pnpm-workspace.yaml'), [
    'packages:',
    "  - 'tooling/*'",
    'minimumReleaseAgeExclude:',
    `  - next@${BASELINE.next}`,
    `  - '@next/env@${BASELINE.next}'`,
    ...SWC_PACKAGES.map((dependency) => `  - '${dependency}@${BASELINE.next}'`),
    '',
  ].join('\n'));

  await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), [
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    '      next:',
    `        specifier: ${BASELINE.next}`,
    `        version: ${BASELINE.next}`,
    '      react:',
    `        specifier: ${BASELINE.react}`,
    `        version: ${BASELINE.react}`,
    '      react-dom:',
    `        specifier: ${BASELINE.reactDom}`,
    `        version: ${BASELINE.reactDom}`,
    '    devDependencies:',
    '      typescript:',
    `        specifier: ${BASELINE.typescript}`,
    `        version: ${BASELINE.typescript}`,
    '',
    '  tooling/code-style:',
    '    dependencies:',
    "      '@typescript/typescript6':",
    `        specifier: ${BASELINE.typescriptBridge}`,
    `        version: ${BASELINE.typescriptBridge}`,
    '',
    'packages:',
    '',
    `  '@next/env@${BASELINE.next}':`,
    '    resolution: {}',
    ...SWC_PACKAGES.flatMap((dependency) => [
      `  '${dependency}@${BASELINE.next}':`,
      '    resolution: {}',
    ]),
    `  '@typescript/typescript6@${BASELINE.typescriptBridge}':`,
    '    resolution: {}',
    `  'next@${BASELINE.next}':`,
    '    resolution: {}',
    `  'react@${BASELINE.react}':`,
    '    resolution: {}',
    `  'react-dom@${BASELINE.reactDom}':`,
    '    resolution: {}',
    `  'typescript@${BASELINE.typescript}':`,
    '    resolution: {}',
    '',
    'snapshots:',
    '',
  ].join('\n'));

  await writeJson(path.join(root, 'node_modules/next/package.json'), {
    name                  : 'next',
    version               : BASELINE.next,
    dependencies          : {
      '@next/env': BASELINE.next
    },
    optionalDependencies  : Object.fromEntries(
      SWC_PACKAGES.map((dependency) => [dependency, BASELINE.next]),
    )
  });
  await writeJson(path.join(root, 'node_modules/react/package.json'), {
    name   : 'react',
    version: BASELINE.react
  });
  await writeJson(path.join(root, 'node_modules/react-dom/package.json'), {
    name   : 'react-dom',
    version: BASELINE.reactDom
  });
  await writeJson(path.join(root, 'node_modules/typescript/package.json'), {
    name   : 'typescript',
    version: BASELINE.typescript
  });
  await writeJson(
    path.join(root, 'tooling/code-style/node_modules/@typescript/typescript6/package.json'),
    {
      name   : '@typescript/typescript6',
      version: BASELINE.typescriptBridge
    },
  );

  return root;
}

test('dependency baseline accepts a coherent frozen fixture', async (context) => {
  const root = await createValidFixture(context);
  assert.deepEqual(await validateDependencyBaseline(root), []);
});

test('dependency baseline rejects runtime and package-manager drift', async (context) => {
  const root          = await createValidFixture(context);
  const manifestPath  = path.join(root, 'package.json');
  const manifest      = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.engines.node = `>=${BASELINE.node}`;
  manifest.devEngines.runtime.onFail = 'warn';
  manifest.packageManager = 'pnpm@0.0.0';
  await writeJson(manifestPath, manifest);

  const errors = await validateDependencyBaseline(root);
  assert(errors.some((error) => error.includes('engines.node')));
  assert(errors.some((error) => error.includes('runtime.onFail')));
  assert(errors.some((error) => error.includes('packageManager')));
});

test('dependency baseline rejects installed compiler and bridge drift', async (context) => {
  const root = await createValidFixture(context);
  await writeJson(path.join(root, 'node_modules/typescript/package.json'), {
    name   : 'typescript',
    version: '6.0.2'
  });

  const toolingManifestPath = path.join(root, 'tooling/code-style/package.json');
  const toolingManifest     = JSON.parse(await fs.readFile(toolingManifestPath, 'utf8'));
  toolingManifest.dependencies.extra = '1.0.0';
  toolingManifest.devDependencies = {
    '@typescript/typescript6': BASELINE.typescriptBridge
  };
  await writeJson(toolingManifestPath, toolingManifest);

  const errors = await validateDependencyBaseline(root);
  assert(errors.some((error) => error.includes('installed native TypeScript version')));
  assert(errors.some((error) => error.includes('may depend only')));
  assert(errors.some((error) => error.includes('dev/optional/peer dependencies')));
});

test('dependency baseline rejects missing and stale Next exclusions', async (context) => {
  const root          = await createValidFixture(context);
  const workspacePath = path.join(root, 'pnpm-workspace.yaml');
  const workspace     = await fs.readFile(workspacePath, 'utf8');
  await fs.writeFile(
    workspacePath,
    workspace
      .replace(`  - '${SWC_PACKAGES[0]}@${BASELINE.next}'\n`, '')
      .concat("  - '@next/env@0.0.0'\n"),
  );

  const errors = await validateDependencyBaseline(root);
  assert(errors.some((error) => error.includes(`missing ${SWC_PACKAGES[0]}@${BASELINE.next}`)));
  assert(errors.some((error) => error.includes('incoherent Next exclusion')));
});

test('dependency baseline validates lockfile root and private importers', async (context) => {
  const root      = await createValidFixture(context);
  const lockPath  = path.join(root, 'pnpm-lock.yaml');
  const lockText  = await fs.readFile(lockPath, 'utf8');
  await fs.writeFile(
    lockPath,
    lockText
      .replace(`        specifier: ${BASELINE.typescriptBridge}\n`, '        specifier: 0.0.0\n')
      .replace(`        version: ${BASELINE.typescriptBridge}\n`, '        version: 0.0.0\n')
      .replace(`  '@typescript/typescript6@${BASELINE.typescriptBridge}':\n    resolution: {}\n`, ''),
  );

  const errors = await validateDependencyBaseline(root);
  assert(errors.some((error) => error.includes('TypeScript 6 bridge') || error.includes('@typescript/typescript6 specifier')));
  assert(errors.some((error) => error.includes('resolved version')));
  assert(errors.some((error) => error.includes(`missing @typescript/typescript6@${BASELINE.typescriptBridge}`)));
});
