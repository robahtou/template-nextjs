import assert                 from 'node:assert/strict';
import { promises as fs }     from 'node:fs';
import os                     from 'node:os';
import path                   from 'node:path';
import test                   from 'node:test';
import { writeAgentFiles }    from 'next/dist/server/lib/generate-agent-files.js';
import {
  CANONICAL_ROOTS,
  NEXT_AGENT_RULES_BLOCK,
  REQUIRED_TOOL_ASSET_PATHS,
  REQUIRED_PATHS,
  SKILL_ROOTS,
  TOOL_ASSET_ROOTS,
  validateGuidance
}                             from './guidance.mjs';


const TEST_EDITOR_ROOT                = 'editor-protocol';
const TEST_CANONICAL_ROOTS            = CANONICAL_ROOTS.map(
  (root) => root === '.cursor' ? TEST_EDITOR_ROOT : root,
);
const TEST_REQUIRED_PATHS             = REQUIRED_PATHS.map(
  (requiredPath) => requiredPath === '.cursor' || requiredPath.startsWith('.cursor/')
    ? requiredPath.replace('.cursor', TEST_EDITOR_ROOT)
    : requiredPath,
);
const TEST_REQUIRED_TOOL_ASSET_PATHS  = REQUIRED_TOOL_ASSET_PATHS.map(
  (requiredPath) => requiredPath.startsWith('.cursor/')
    ? requiredPath.replace('.cursor', TEST_EDITOR_ROOT)
    : requiredPath,
);
const TEST_TOOL_ASSET_ROOTS           = TOOL_ASSET_ROOTS.map(
  (root) => root === '.cursor' ? TEST_EDITOR_ROOT : root,
);
const TEST_SKILL_ROOTS                = {
  agent : SKILL_ROOTS.agent,
  cursor: SKILL_ROOTS.cursor.replace('.cursor', TEST_EDITOR_ROOT)
};
const TEST_OPTIONS                    = {
  canonicalRoots          : TEST_CANONICAL_ROOTS,
  requiredPaths           : TEST_REQUIRED_PATHS,
  requiredToolAssetPaths  : TEST_REQUIRED_TOOL_ASSET_PATHS,
  skillRoots              : TEST_SKILL_ROOTS,
  toolAssetRoots          : TEST_TOOL_ASSET_ROOTS
};

async function writeFile(filePath, contents = '') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
}

function requiredFixtureContent(requiredPath) {
  if (requiredPath === 'README.md') {
    return [
      '# Template',
      '',
      'See the [documentation](docs/CONTEXT.md).',
      '',
      'Use `pnpm install`, `pnpm lint -- --strict`, or `pnpm run verify --reporter spec`.',
      '',
      'External [sites](https://example.com), [mail](mailto:test@example.com), and [anchors](#template) are ignored.',
      '',
      '```md',
      '[fixture](missing.md)',
      '`pnpm missing`',
      '```',
      '',
    ].join('\n');
  }

  if (requiredPath === 'AGENTS.md') {
    return `${NEXT_AGENT_RULES_BLOCK}\n`;
  }

  const skillPath = /^(?:\.agents|editor-protocol)\/skills\/([^/]+)\/(.+)$/u.exec(
    requiredPath,
  );
  if (skillPath && skillPath[2] !== 'agents/openai.yaml') {
    if (skillPath[2] === 'SKILL.md') {
      return [
        '---',
        `name: ${skillPath[1]}`,
        `description: Fixture capability for ${skillPath[1]}.`,
        '---',
        `# ${skillPath[1]}`,
        '',
      ].join('\n');
    }

    return `# ${skillPath[1]}/${skillPath[2]}\n`;
  }

  return `# ${requiredPath}\n`;
}

async function createValidFixture(context) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'guidance-without-git-'));
  context.after(() => fs.rm(root, { force: true, recursive: true }));

  await writeFile(path.join(root, 'package.json'), `${JSON.stringify({
    scripts: {
      lint  : 'node lint.mjs',
      verify: 'node verify.mjs'
    }
  })}\n`);

  for (const requiredPath of TEST_REQUIRED_PATHS) {
    if (path.extname(requiredPath)) {
      await writeFile(
        path.join(root, requiredPath),
        requiredFixtureContent(requiredPath),
      );
    } else {
      await fs.mkdir(path.join(root, requiredPath), { recursive: true });
    }
  }

  return root;
}

test('guidance accepts canonical paths, protocol names, links, and commands without .git', async (context) => {
  const root = await createValidFixture(context);
  assert.equal(await fs.stat(path.join(root, '.git')).then(() => true, () => false), false);
  assert(REQUIRED_PATHS.includes('.cursor'));
  assert.deepEqual(await validateGuidance(root, TEST_OPTIONS), []);
});

test('guidance ignores empty legacy directories', async (context) => {
  const root = await createValidFixture(context);
  await fs.mkdir(path.join(root, 'prompts'));

  assert.deepEqual(await validateGuidance(root, TEST_OPTIONS), []);
});

test('guidance allows only the current Next-managed root agent rules', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(path.join(root, 'AGENTS.md'), `${NEXT_AGENT_RULES_BLOCK}\n`);

  assert.deepEqual(await validateGuidance(root, TEST_OPTIONS), []);
});

test('tracked root agent rules match Next without scaffolding another protocol', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'next-agent-rules-'));
  context.after(() => fs.rm(root, { force: true, recursive: true }));

  await writeFile(path.join(root, 'AGENTS.md'), `${NEXT_AGENT_RULES_BLOCK}\n`);
  writeAgentFiles(root);

  const generatedAgentRules = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal(generatedAgentRules.trim(), NEXT_AGENT_RULES_BLOCK);
  assert.deepEqual(await fs.readdir(root), ['AGENTS.md']);
});

test('guidance rejects malformed or extended root agent rules', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(
    path.join(root, 'AGENTS.md'),
    `${NEXT_AGENT_RULES_BLOCK}\n\n# Project instructions\n`,
  );

  let errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('AGENTS.md')));

  await writeFile(
    path.join(root, 'AGENTS.md'),
    '<!-- BEGIN:nextjs-agent-rules -->\n\n# Stale block\n',
  );

  errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('AGENTS.md')));
});

test('guidance reports missing required paths', async (context) => {
  const root = await createValidFixture(context);
  await fs.rm(path.join(root, 'docs/routes/CONTEXT.md'));
  await fs.rm(path.join(root, 'src/lib/CONTEXT.md'));
  await fs.mkdir(path.join(root, 'src/lib/CONTEXT.md'));

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('docs/routes/CONTEXT.md')));
  assert(errors.some((error) => (
    error.includes('must be a file')
    && error.includes('src/lib/CONTEXT.md')
  )));
});

test('guidance reports missing curated agent and editor assets', async (context) => {
  const root              = await createValidFixture(context);
  const missingAgentPath  = '.agents/skills/node/references/streams.md';
  const missingEditorPath = `${TEST_EDITOR_ROOT}/skills/cache-components-fetch-policy/policy.md`;

  await fs.rm(path.join(root, missingAgentPath));
  await fs.rm(path.join(root, missingEditorPath));

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes(missingAgentPath)));
  assert(errors.some((error) => error.includes(missingEditorPath)));
});

test('guidance requires every skill capability in both environments', async (context) => {
  const root      = await createValidFixture(context);
  const skillName = 'greenfield';

  await fs.rm(path.join(root, TEST_SKILL_ROOTS.cursor, skillName), {
    recursive: true
  });

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => (
    error.includes('Skill capability is missing')
    && error.includes(TEST_SKILL_ROOTS.cursor)
    && error.includes(skillName)
  )));
});

test('guidance requires valid and byte-identical mirrored skill entrypoints', async (context) => {
  const root              = await createValidFixture(context);
  const skillName         = 'greenfield';
  const agentEntrypoint   = path.join(root, TEST_SKILL_ROOTS.agent, skillName, 'SKILL.md');
  const cursorEntrypoint  = path.join(root, TEST_SKILL_ROOTS.cursor, skillName, 'SKILL.md');

  await fs.appendFile(cursorEntrypoint, '# Cursor-only drift\n');

  let errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => (
    error.includes('Mirrored skill content differs')
    && error.includes(skillName)
    && error.includes('SKILL.md')
  )));

  const invalidEntrypoint = [
    '---',
    'name: wrong-name',
    'description: Invalid fixture name.',
    '---',
    '# Invalid',
    '',
  ].join('\n');
  await Promise.all([
    fs.writeFile(agentEntrypoint, invalidEntrypoint),
    fs.writeFile(cursorEntrypoint, invalidEntrypoint),
  ]);

  errors = await validateGuidance(root, TEST_OPTIONS);
  assert.equal(errors.filter((error) => (
    error.includes('Skill entrypoint must declare matching name')
    && error.includes(skillName)
  )).length, 2);
});

test('guidance rejects unexpected curated files and symbolic links', async (context) => {
  const root                  = await createValidFixture(context);
  const unexpectedAgentPath   = '.agents/notes.md';
  const unexpectedEditorPath  = `${TEST_EDITOR_ROOT}/rules/extra.mdc`;
  const agentLinkPath         = '.agents/skills/node/references/testing-link.md';
  const editorLinkPath        = `${TEST_EDITOR_ROOT}/skills/cache-components-fetch-policy/policy-link.md`;

  await writeFile(path.join(root, unexpectedAgentPath), '# Unexpected agent notes\n');
  await writeFile(path.join(root, unexpectedEditorPath), '# Unexpected editor rule\n');
  await fs.symlink('testing.md', path.join(root, agentLinkPath));
  await fs.symlink('policy.md', path.join(root, editorLinkPath));

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => (
    error.includes('Unexpected curated guidance file')
    && error.includes(unexpectedAgentPath)
  )));
  assert(errors.some((error) => (
    error.includes('Unexpected curated guidance file')
    && error.includes(unexpectedEditorPath)
  )));
  assert(errors.some((error) => (
    error.includes('must not contain symbolic links')
    && error.includes(agentLinkPath)
  )));
  assert(errors.some((error) => (
    error.includes('must not contain symbolic links')
    && error.includes(editorLinkPath)
  )));
});

test('guidance rejects only known legacy guide sources', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(path.join(root, 'src/lib/minime.md'), '# Legacy\n');
  await writeFile(path.join(root, 'src/components/design-notes.md'), '# Allowed ordinary document\n');
  await writeFile(path.join(root, 'prompts/project.md'), '# Legacy prompt\n');
  await writeFile(path.join(root, 'AGENTS.md'), '# Forbidden root guide\n');

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('minime.md')));
  assert(errors.some((error) => error.includes('prompts')));
  assert(errors.some((error) => error.includes('AGENTS.md')));
  assert(!errors.some((error) => error.includes('design-notes.md')));
});

test('guidance validates local links and root package command references', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(path.join(root, 'docs/architecture/broken.md'), [
    '# Broken references',
    '',
    '[Missing](../missing/CONTEXT.md?view=full#section)',
    '',
    '`pnpm unknown --fix`',
    '',
  ].join('\n'));

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('Broken local Markdown link')));
  assert(errors.some((error) => error.includes('pnpm unknown')));
});

test('guidance enforces exact identity boundaries', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(path.join(root, 'docs/identity.md'), [
    '# Identity',
    '',
    'MySite is forbidden, while MySitePlus is a different token.',
    '',
  ].join('\n'));

  const errors = await validateGuidance(root, TEST_OPTIONS);
  assert(errors.some((error) => error.includes('Denied placeholder identity MySite')));

  await fs.writeFile(
    path.join(root, 'docs/identity.md'),
    '# Identity\n\nMySitePlus is not the exact placeholder token.\n',
  );
  assert.deepEqual(await validateGuidance(root, TEST_OPTIONS), []);
});

test('guidance ignores excluded negative fixtures and generated trees', async (context) => {
  const root = await createValidFixture(context);
  await writeFile(
    path.join(root, 'docs/fixtures/minimi.md'),
    '# Negative fixture\n\n[Broken](missing.md)\n\nMyWebSite\n',
  );
  await writeFile(
    path.join(root, 'src/.next/generated.md'),
    '# Generated\n\n[Broken](missing.md)\n',
  );

  assert.deepEqual(await validateGuidance(root, TEST_OPTIONS), []);
});
