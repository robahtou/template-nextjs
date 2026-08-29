import assert               from 'node:assert/strict';
import { spawnSync }        from 'node:child_process';
import fs                   from 'node:fs/promises';
import os                   from 'node:os';
import path                 from 'node:path';
import process              from 'node:process';
import test                 from 'node:test';
import { fileURLToPath }    from 'node:url';

import { formatSourceText } from './typescript-const-layout.mjs';


const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('fails clearly when source is not parseable by the compatibility API', () => {
  assert.throws(
    () => formatSourceText('const broken = {', 'broken.ts'),
    /not parseable by the TypeScript 6 compatibility API/u
  );
});

test('keeps commented const declarations in the same alignment group', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'commented-const-group.ts');
  const input           = [
    'const localeValues = [\'en\', \'es\'] as const;',
    'const defaultLocale = \'en\';',
    'const localeCookieName = buildAppCookieName(\'locale\');',
    'const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365; // 1 year',
    'const localeCookiePath = \'/\';',
    'const localeCookieSameSite = \'lax\';',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const localeValues              = [\'en\', \'es\'] as const;',
    'const defaultLocale             = \'en\';',
    'const localeCookieName          = buildAppCookieName(\'locale\');',
    'const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365; // 1 year',
    'const localeCookiePath          = \'/\';',
    'const localeCookieSameSite      = \'lax\';',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('groups and aligns consecutive exported type alias one-liners', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'exported-type-aliases.ts');
  const input           = [
    'export type SnapshotScopeMode = typeof SNAPSHOT_SCOPE_MODES[number];',
    '',
    'export type DdlSurfaceKey = typeof DDL_SURFACE_KEYS[number];',
    '',
    'export type DeploymentSurfaceKey = typeof DEPLOYMENT_SURFACE_KEYS[number];',
    '',
    'export type SnapshotSurfaceKey = DdlSurfaceKey | DeploymentSurfaceKey;',
    '',
    'export type SchemaStateRow = object;',
    ''
  ].join('\n');
  const expectedOutput  = [
    'export type SnapshotScopeMode     = typeof SNAPSHOT_SCOPE_MODES[number];',
    'export type DdlSurfaceKey         = typeof DDL_SURFACE_KEYS[number];',
    'export type DeploymentSurfaceKey  = typeof DEPLOYMENT_SURFACE_KEYS[number];',
    'export type SnapshotSurfaceKey    = DdlSurfaceKey | DeploymentSurfaceKey;',
    'export type SchemaStateRow        = object;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('groups non-exported type aliases across blank lines', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'type-alias-group.ts');
  const input           = [
    'type DraftQuoteLineKind = \'catalog_model\' | \'custom_item\';',
    'type DraftQuoteModelKindCode = \'equipment\' | \'accessory\' | null;',
    'type DraftQuotePriceSourceCode = \'catalog_base_price\' | \'manual\';',
    '',
    'type CatalogFilterFieldKey = (typeof catalogFilterFieldKeys)[number];',
    'type CatalogStatusFilterValue = (typeof catalogStatusFilterValues)[number];',
    'type CatalogApiSort = (typeof catalogApiSortValues)[number];',
    'type CatalogSearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>;',
    ''
  ].join('\n');
  const expectedOutput  = [
    'type DraftQuoteLineKind        = \'catalog_model\' | \'custom_item\';',
    'type DraftQuoteModelKindCode   = \'equipment\' | \'accessory\' | null;',
    'type DraftQuotePriceSourceCode = \'catalog_base_price\' | \'manual\';',
    'type CatalogFilterFieldKey     = (typeof catalogFilterFieldKeys)[number];',
    'type CatalogStatusFilterValue  = (typeof catalogStatusFilterValues)[number];',
    'type CatalogApiSort            = (typeof catalogApiSortValues)[number];',
    'type CatalogSearchParamSource  = URLSearchParams | Record<string, string | string[] | undefined>;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('does not inject text when nested const groups are reformatted', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'nested-const-groups.tsx');
  const input           = [
    'const sortedProducts = useMemo(() => {',
    '  const leftTs = Date.parse(left.createdAt ?? \'\') || 0;',
    '  const rightTs = Date.parse(right.createdAt ?? \'\') || 0;',
    '  return filteredProducts;',
    '}, [filteredProducts]);',
    'const hasActiveFilters = selectedCategory !== \'all\'',
    '  || selectedBrand !== \'all\'',
    '  || selectedSeries !== \'all\'',
    '  || selectedEquipmentType !== \'all\'',
    '  || selectedDoorType !== \'all\'',
    '  || selectedConfiguration !== \'all\'',
    '  || selectedWarehouse !== \'all\'',
    '  || sortBy !== \'default\'',
    '  || searchTerm.trim().length > 0',
    '  || inStockOnly',
    '  || showInactive',
    '  || showFavoritesOnly;',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const sortedProducts   = useMemo(() => {',
    '  const leftTs  = Date.parse(left.createdAt ?? \'\') || 0;',
    '  const rightTs = Date.parse(right.createdAt ?? \'\') || 0;',
    '  return filteredProducts;',
    '}, [filteredProducts]);',
    'const hasActiveFilters = selectedCategory !== \'all\'',
    '  || selectedBrand !== \'all\'',
    '  || selectedSeries !== \'all\'',
    '  || selectedEquipmentType !== \'all\'',
    '  || selectedDoorType !== \'all\'',
    '  || selectedConfiguration !== \'all\'',
    '  || selectedWarehouse !== \'all\'',
    '  || sortBy !== \'default\'',
    '  || searchTerm.trim().length > 0',
    '  || inStockOnly',
    '  || showInactive',
    '  || showFavoritesOnly;',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('aligns consecutive useState tuple declarations without widening plain consts', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'use-state-tuples.tsx');
  const input           = [
    'const router = useRouter();',
    'const [products, setProducts] = useState<CatalogProduct[]>([]);',
    'const [loading, setLoading] = useState(true);',
    'const [errorMessage, setErrorMessage] = useState<string | null>(null);',
    'const [searchTerm, setSearchTerm] = useState(\'\');',
    'const [selectedEquipmentType, setSelectedEquipmentType] = useState(\'all\');',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const router = useRouter();',
    'const [products, setProducts]                           = useState<CatalogProduct[]>([]);',
    'const [loading, setLoading]                             = useState(true);',
    'const [errorMessage, setErrorMessage]                   = useState<string | null>(null);',
    'const [searchTerm, setSearchTerm]                       = useState(\'\');',
    'const [selectedEquipmentType, setSelectedEquipmentType] = useState(\'all\');',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});

test('stops a useState tuple alignment group after a multiline initializer', async (testContext) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'typescript-const-layout-'));
  testContext.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const fixturePath     = path.join(tempDirectory, 'multiline-use-state-tuple.tsx');
  const input           = [
    'const [emailAddress, setEmailAddress] = useState(() => initialEmailAddress);',
    'const [userPassword, setUserPassword] = useState(\'\');',
    'const [verificationBanner, setVerificationBanner] = useState<VerificationBannerState | null>(() => {',
    '  return null;',
    '});',
    'const [isResendingVerification, setIsResendingVerification] = useState(false);',
    ''
  ].join('\n');
  const expectedOutput  = [
    'const [emailAddress, setEmailAddress]             = useState(() => initialEmailAddress);',
    'const [userPassword, setUserPassword]             = useState(\'\');',
    'const [verificationBanner, setVerificationBanner] = useState<VerificationBannerState | null>(() => {',
    '  return null;',
    '});',
    'const [isResendingVerification, setIsResendingVerification] = useState(false);',
    ''
  ].join('\n');

  await fs.writeFile(fixturePath, input, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['tooling/code-style/typescript-const-layout.mjs', '--fix', '--file', fixturePath],
    {
      cwd     : repoRoot,
      encoding: 'utf8'
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n')
  );

  const actualOutput = await fs.readFile(fixturePath, 'utf8');

  assert.equal(actualOutput, expectedOutput);
});
