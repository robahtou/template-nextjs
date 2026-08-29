import { promises as fs } from 'node:fs';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';


const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT  = path.resolve(SCRIPT_DIRECTORY, '..', '..');

const CANONICAL_ROOTS = Object.freeze([
  'README.md',
  'docs',
  'src',
  'scripts/lint',
  'tooling/code-style',
  '.agents',
  '.cursor',
]);

const TOOL_ASSET_ROOTS = Object.freeze([
  '.agents',
  '.cursor',
]);

const SKILL_ROOTS = Object.freeze({
  agent : '.agents/skills',
  cursor: '.cursor/skills'
});

const REQUIRED_TOOL_ASSET_PATHS = Object.freeze([
  '.agents/skills/cache-components-fetch-policy/SKILL.md',
  '.agents/skills/cache-components-fetch-policy/agents/openai.yaml',
  '.agents/skills/cache-components-fetch-policy/policy.md',
  '.agents/skills/greenfield/SKILL.md',
  '.agents/skills/greenfield/agents/openai.yaml',
  '.agents/skills/nextjs-audit/SKILL.md',
  '.agents/skills/nextjs-audit/agents/openai.yaml',
  '.agents/skills/nextjs-turbopack-cachecomponents-debugging/SKILL.md',
  '.agents/skills/nextjs-turbopack-cachecomponents-debugging/agents/openai.yaml',
  '.agents/skills/nextjs-turbopack-cachecomponents-debugging/reference.md',
  '.agents/skills/node/SKILL.md',
  '.agents/skills/node/agents/openai.yaml',
  '.agents/skills/node/references/async-patterns.md',
  '.agents/skills/node/references/caching.md',
  '.agents/skills/node/references/environment.md',
  '.agents/skills/node/references/error-handling.md',
  '.agents/skills/node/references/flaky-tests.md',
  '.agents/skills/node/references/graceful-shutdown.md',
  '.agents/skills/node/references/logging.md',
  '.agents/skills/node/references/modules.md',
  '.agents/skills/node/references/node-modules-exploration.md',
  '.agents/skills/node/references/performance.md',
  '.agents/skills/node/references/profiling.md',
  '.agents/skills/node/references/streams.md',
  '.agents/skills/node/references/testing.md',
  '.agents/skills/node/references/typescript.md',
  '.agents/skills/nodejs-core/SKILL.md',
  '.agents/skills/nodejs-core/agents/openai.yaml',
  '.agents/skills/nodejs-core/references/event-loop-libuv.md',
  '.agents/skills/nodejs-core/references/memory-gc.md',
  '.agents/skills/nodejs-core/references/runtime-profiling.md',
  '.agents/skills/nodejs-core/references/v8-jit.md',
  '.agents/skills/nodejs-core/references/workers-native.md',
  '.agents/skills/provide-five-part-implementation-plan/SKILL.md',
  '.agents/skills/provide-five-part-implementation-plan/agents/openai.yaml',
  '.agents/skills/provide-implementation-plan/SKILL.md',
  '.agents/skills/provide-implementation-plan/agents/openai.yaml',
  '.agents/skills/react-nextjs-best-practices/SKILL.md',
  '.agents/skills/react-nextjs-best-practices/agents/openai.yaml',
  '.agents/skills/typescript-import-layout/SKILL.md',
  '.agents/skills/typescript-import-layout/agents/openai.yaml',
  '.agents/skills/typescript-magician/SKILL.md',
  '.agents/skills/typescript-magician/agents/openai.yaml',
  '.agents/skills/typescript-magician/references/conditional-and-mapped-types.md',
  '.agents/skills/typescript-magician/references/diagnostics.md',
  '.agents/skills/typescript-magician/references/inference-and-generics.md',
  '.agents/skills/typescript-magician/references/narrowing.md',
  '.agents/skills/typescript-magician/references/overloads-and-brands.md',
  '.agents/skills/typescript-magician/references/runtime-derived-types.md',
  '.agents/skills/typescript-object-layout/SKILL.md',
  '.agents/skills/typescript-object-layout/agents/openai.yaml',
  '.agents/skills/typescript-parameter-layout/SKILL.md',
  '.agents/skills/typescript-parameter-layout/agents/openai.yaml',
  '.agents/skills/write-commit-message/SKILL.md',
  '.agents/skills/write-commit-message/agents/openai.yaml',
  '.agents/skills/write-session-commit/SKILL.md',
  '.agents/skills/write-session-commit/agents/openai.yaml',
  '.cursor/commands/css-formatting.md',
  '.cursor/commands/document-component.md',
  '.cursor/commands/dynamic-apis.md',
  '.cursor/commands/nextjs-audit.md',
  '.cursor/commands/nextjs-playbook.md',
  '.cursor/commands/provide-five-part-implementation-plan.md',
  '.cursor/commands/provide-implementation-plan.md',
  '.cursor/commands/record-nextjs-lesson.md',
  '.cursor/hooks.json',
  '.cursor/hooks/run-fmt-file.mjs',
  '.cursor/hooks/run-fmt-file.test.mjs',
  '.cursor/rules/accessibility.mdc',
  '.cursor/rules/code/code.mdc',
  '.cursor/rules/context-md.mdc',
  '.cursor/rules/css/css.mdc',
  '.cursor/rules/format-after-edit.mdc',
  '.cursor/rules/next-modern.mdc',
  '.cursor/rules/nextjs-lessons-documentation.mdc',
  '.cursor/rules/pnpm/pnpm.mdc',
  '.cursor/rules/project.mdc',
  '.cursor/rules/prose.mdc',
  '.cursor/rules/protected-routes-security.mdc',
  '.cursor/rules/react-compiler.mdc',
  '.cursor/rules/styling-architecture.mdc',
  '.cursor/skills/cache-components-fetch-policy/SKILL.md',
  '.cursor/skills/cache-components-fetch-policy/policy.md',
  '.cursor/skills/greenfield/SKILL.md',
  '.cursor/skills/nextjs-audit/SKILL.md',
  '.cursor/skills/nextjs-turbopack-cachecomponents-debugging/SKILL.md',
  '.cursor/skills/nextjs-turbopack-cachecomponents-debugging/reference.md',
  '.cursor/skills/node/SKILL.md',
  '.cursor/skills/node/references/async-patterns.md',
  '.cursor/skills/node/references/caching.md',
  '.cursor/skills/node/references/environment.md',
  '.cursor/skills/node/references/error-handling.md',
  '.cursor/skills/node/references/flaky-tests.md',
  '.cursor/skills/node/references/graceful-shutdown.md',
  '.cursor/skills/node/references/logging.md',
  '.cursor/skills/node/references/modules.md',
  '.cursor/skills/node/references/node-modules-exploration.md',
  '.cursor/skills/node/references/performance.md',
  '.cursor/skills/node/references/profiling.md',
  '.cursor/skills/node/references/streams.md',
  '.cursor/skills/node/references/testing.md',
  '.cursor/skills/node/references/typescript.md',
  '.cursor/skills/nodejs-core/SKILL.md',
  '.cursor/skills/nodejs-core/references/event-loop-libuv.md',
  '.cursor/skills/nodejs-core/references/memory-gc.md',
  '.cursor/skills/nodejs-core/references/runtime-profiling.md',
  '.cursor/skills/nodejs-core/references/v8-jit.md',
  '.cursor/skills/nodejs-core/references/workers-native.md',
  '.cursor/skills/provide-five-part-implementation-plan/SKILL.md',
  '.cursor/skills/provide-implementation-plan/SKILL.md',
  '.cursor/skills/react-nextjs-best-practices/SKILL.md',
  '.cursor/skills/typescript-import-layout/SKILL.md',
  '.cursor/skills/typescript-magician/SKILL.md',
  '.cursor/skills/typescript-magician/references/conditional-and-mapped-types.md',
  '.cursor/skills/typescript-magician/references/diagnostics.md',
  '.cursor/skills/typescript-magician/references/inference-and-generics.md',
  '.cursor/skills/typescript-magician/references/narrowing.md',
  '.cursor/skills/typescript-magician/references/overloads-and-brands.md',
  '.cursor/skills/typescript-magician/references/runtime-derived-types.md',
  '.cursor/skills/typescript-object-layout/SKILL.md',
  '.cursor/skills/typescript-parameter-layout/SKILL.md',
  '.cursor/skills/write-commit-message/SKILL.md',
  '.cursor/skills/write-session-commit/SKILL.md',
]);

const REQUIRED_PATHS = Object.freeze([
  'AGENTS.md',
  'README.md',
  'docs/CONTEXT.md',
  'docs/adoption/CONTEXT.md',
  'docs/architecture/CONTEXT.md',
  'docs/nextjs/CONTEXT.md',
  'docs/nextjs/diagnostics/CONTEXT.md',
  'docs/nextjs/lessons/CONTEXT.md',
  'docs/routes/CONTEXT.md',
  'src/app/CONTEXT.md',
  'src/app/_components/CONTEXT.md',
  'src/assets/CONTEXT.md',
  'src/assets/styles/CONTEXT.md',
  'src/components/CONTEXT.md',
  'src/lib/CONTEXT.md',
  'src/utils/CONTEXT.md',
  'scripts/lint/CONTEXT.md',
  'tooling/code-style/CONTEXT.md',
  '.agents',
  '.cursor',
  ...REQUIRED_TOOL_ASSET_PATHS,
]);

const FORBIDDEN_ROOT_PATHS = Object.freeze([
  'CONTRIBUTING.md',
  'prompts',
]);

const NEXT_AGENT_RULES_START_MARKER = '<!-- BEGIN:nextjs-agent-rules -->';
const NEXT_AGENT_RULES_END_MARKER   = '<!-- END:nextjs-agent-rules -->';
const NEXT_AGENT_RULES_BLOCK        = [
  NEXT_AGENT_RULES_START_MARKER,
  '',
  '# This is NOT the Next.js you know',
  '',
  'This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file\'s directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.',
  '',
  'This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.',
  '',
  NEXT_AGENT_RULES_END_MARKER,
].join('\n');

const EXCLUDED_DIRECTORIES = new Set([
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
  'test-fixtures',
]);

const DENIED_IDENTITIES = Object.freeze([
  'MyWebSite',
  'MySite',
  'pg-query-client-theme',
]);

const PNPM_BUILT_INS = new Set([
  'add',
  'dlx',
  'exec',
  'install',
  'list',
  'outdated',
  'remove',
  'update',
  'why',
]);

const GUIDANCE_TEXT_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.mdc',
  '.yaml',
  '.yml',
]);

function isInside(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (
    relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
  );
}

function isExcluded(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath
    .split(path.sep)
    .some((segment) => EXCLUDED_DIRECTORIES.has(segment));
}

async function pathExists(candidatePath) {
  try {
    await fs.access(candidatePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

async function forbiddenPathHasContent(candidatePath) {
  try {
    const entry = await fs.lstat(candidatePath);

    if (entry.isDirectory()) {
      return (await fs.readdir(candidatePath)).length > 0;
    }

    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

function isCurrentNextAgentRules(content) {
  if (typeof content !== 'string') return false;

  return content
    .replace(/\r\n|\r/gu, '\n')
    .trim() === NEXT_AGENT_RULES_BLOCK;
}

async function collectCanonicalFiles(repositoryRoot, canonicalRoots = CANONICAL_ROOTS) {
  const rootPath = path.resolve(repositoryRoot);
  const files    = [];

  async function visit(candidatePath) {
    if (!isInside(rootPath, candidatePath) || isExcluded(rootPath, candidatePath)) {
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

    if (entry.isFile()) {
      files.push(candidatePath);
    }
  }

  for (const root of canonicalRoots) {
    await visit(path.join(rootPath, root));
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

async function collectToolAssetEntries(
  repositoryRoot,
  toolAssetRoots = TOOL_ASSET_ROOTS,
) {
  const rootPath            = path.resolve(repositoryRoot);
  const files               = [];
  const symbolicLinks       = [];
  const unsupportedEntries  = [];

  function relativePath(candidatePath) {
    return path.relative(rootPath, candidatePath).split(path.sep).join('/');
  }

  async function visit(candidatePath) {
    if (!isInside(rootPath, candidatePath)) {
      return;
    }

    let entry;
    try {
      entry = await fs.lstat(candidatePath);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
        return;
      }
      throw error;
    }

    if (entry.isSymbolicLink()) {
      symbolicLinks.push(relativePath(candidatePath));
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

    if (entry.isFile()) {
      files.push(relativePath(candidatePath));
      return;
    }

    unsupportedEntries.push(relativePath(candidatePath));
  }

  for (const root of toolAssetRoots) {
    await visit(path.join(rootPath, root));
  }

  const comparePaths = (left, right) => left.localeCompare(right, 'en');

  return {
    files               : files.sort(comparePaths),
    symbolicLinks       : symbolicLinks.sort(comparePaths),
    unsupportedEntries  : unsupportedEntries.sort(comparePaths)
  };
}

async function collectSkillContents(
  repositoryRoot,
  skillsRoot,
  excludedRootDirectories = [],
) {
  const rootPath    = path.resolve(repositoryRoot);
  const skillsPath  = path.resolve(rootPath, skillsRoot);
  const exclusions  = new Set(excludedRootDirectories);
  const skills      = new Map();

  let skillDirectories;
  try {
    skillDirectories = await fs.readdir(skillsPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return skills;
    }
    throw error;
  }

  skillDirectories.sort((left, right) => left.name.localeCompare(right.name, 'en'));

  for (const skillDirectory of skillDirectories) {
    if (!skillDirectory.isDirectory()) {
      continue;
    }

    const skillPath = path.join(skillsPath, skillDirectory.name);
    const files     = new Map();

    async function visit(candidatePath) {
      const entry        = await fs.lstat(candidatePath);
      const relativePath = path.relative(skillPath, candidatePath);

      if (entry.isSymbolicLink()) {
        return;
      }

      if (entry.isDirectory()) {
        if (
          relativePath !== ''
          && path.dirname(relativePath) === '.'
          && exclusions.has(relativePath)
        ) {
          return;
        }

        const children = await fs.readdir(candidatePath, { withFileTypes: true });
        children.sort((left, right) => left.name.localeCompare(right.name, 'en'));
        for (const child of children) {
          await visit(path.join(candidatePath, child.name));
        }
        return;
      }

      if (entry.isFile()) {
        files.set(relativePath.split(path.sep).join('/'), candidatePath);
      }
    }

    await visit(skillPath);
    skills.set(skillDirectory.name, files);
  }

  return skills;
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && (
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'"))
    )
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function skillFrontmatter(sourceText) {
  const normalized  = sourceText.replace(/\r\n|\r/gu, '\n');
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(normalized)?.[1];
  if (!frontmatter) {
    return undefined;
  }

  const name        = /^name:\s*(.+)$/mu.exec(frontmatter)?.[1];
  const description = /^description:\s*(.+)$/mu.exec(frontmatter)?.[1];

  return {
    name       : name === undefined ? undefined : unquoteYamlScalar(name),
    description: description === undefined
      ? undefined
      : unquoteYamlScalar(description)
  };
}

async function validateSkillParity(
  repositoryRoot,
  skillRoots = SKILL_ROOTS,
) {
  const rootPath = path.resolve(repositoryRoot);
  const errors   = [];
  const [agentSkills, cursorSkills] = await Promise.all([
    collectSkillContents(rootPath, skillRoots.agent, ['agents']),
    collectSkillContents(rootPath, skillRoots.cursor),
  ]);
  const skillNames = [...new Set([
    ...agentSkills.keys(),
    ...cursorSkills.keys(),
  ])].sort((left, right) => left.localeCompare(right, 'en'));

  for (const skillName of skillNames) {
    const agentFiles  = agentSkills.get(skillName);
    const cursorFiles = cursorSkills.get(skillName);

    if (!agentFiles) {
      errors.push(`Skill capability is missing from ${skillRoots.agent}: ${skillName}.`);
      continue;
    }
    if (!cursorFiles) {
      errors.push(`Skill capability is missing from ${skillRoots.cursor}: ${skillName}.`);
      continue;
    }

    for (const [label, files] of [
      [skillRoots.agent, agentFiles],
      [skillRoots.cursor, cursorFiles],
    ]) {
      const entrypointPath = files.get('SKILL.md');
      if (!entrypointPath) {
        errors.push(`Skill entrypoint is missing from ${label}/${skillName}: SKILL.md.`);
        continue;
      }

      const frontmatter = skillFrontmatter(await fs.readFile(entrypointPath, 'utf8'));
      if (
        !frontmatter
        || frontmatter.name !== skillName
        || !frontmatter.description
      ) {
        errors.push(
          `Skill entrypoint must declare matching name and non-empty description: ${label}/${skillName}/SKILL.md.`,
        );
      }
    }

    const filePaths = [...new Set([
      ...agentFiles.keys(),
      ...cursorFiles.keys(),
    ])].sort((left, right) => left.localeCompare(right, 'en'));

    for (const filePath of filePaths) {
      const agentFile  = agentFiles.get(filePath);
      const cursorFile = cursorFiles.get(filePath);

      if (!agentFile || !cursorFile) {
        errors.push(`Mirrored skill file is missing for ${skillName}: ${filePath}.`);
        continue;
      }

      const [agentContent, cursorContent] = await Promise.all([
        fs.readFile(agentFile),
        fs.readFile(cursorFile),
      ]);
      if (!agentContent.equals(cursorContent)) {
        errors.push(`Mirrored skill content differs for ${skillName}: ${filePath}.`);
      }
    }
  }

  return errors;
}

function withoutFencedCode(markdown) {
  const lines = markdown.split(/\r\n|\n|\r/u);
  let fence;

  return lines
    .map((line) => {
      const opening = /^\s{0,3}(`{3,}|~{3,})/u.exec(line)?.[1];
      if (!fence && opening) {
        fence = opening;
        return '';
      }

      if (fence) {
        const character = fence[0];
        if (new RegExp(`^\\s{0,3}${character}{${fence.length},}\\s*$`, 'u').test(line)) {
          fence = undefined;
        }
        return '';
      }

      return line;
    })
    .join('\n');
}

function extractMarkdownLinks(markdown) {
  const visibleMarkdown     = withoutFencedCode(markdown);
  const targets             = [];
  const inlineLink          = /!?\[[^\]\n]*\]\(([^)\n]+)\)/gu;
  const referenceDefinition = /^\s{0,3}\[[^\]\n]+\]:\s*(\S+)/gmu;

  for (const match of visibleMarkdown.matchAll(inlineLink)) {
    const rawTarget = match[1].trim();
    if (rawTarget.startsWith('<')) {
      const end = rawTarget.indexOf('>');
      targets.push(end === -1 ? rawTarget : rawTarget.slice(1, end));
    } else {
      targets.push(rawTarget.split(/\s+/u)[0]);
    }
  }

  for (const match of visibleMarkdown.matchAll(referenceDefinition)) {
    targets.push(match[1].replace(/^<|>$/gu, ''));
  }

  return targets;
}

function isExternalOrFragmentLink(target) {
  return (
    target.startsWith('#')
    || target.startsWith('//')
    || /^[A-Za-z][A-Za-z\d+.-]*:/u.test(target)
  );
}

function localLinkPath(repositoryRoot, sourceFile, target) {
  if (isExternalOrFragmentLink(target)) {
    return undefined;
  }

  const suffixStart   = target.search(/[?#]/u);
  const withoutSuffix = suffixStart === -1 ? target : target.slice(0, suffixStart);
  if (withoutSuffix === '') {
    return undefined;
  }

  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(withoutSuffix);
  } catch {
    decodedTarget = withoutSuffix;
  }

  if (decodedTarget.startsWith('/')) {
    return path.resolve(repositoryRoot, `.${decodedTarget}`);
  }

  return path.resolve(path.dirname(sourceFile), decodedTarget);
}

function commandReferences(markdown) {
  const visibleMarkdown = withoutFencedCode(markdown);
  const references      = [];

  for (const codeMatch of visibleMarkdown.matchAll(/`([^`\n]+)`/gu)) {
    const code = codeMatch[1];
    for (const commandMatch of code.matchAll(/\bpnpm\s+([^\s`;&|]+)(?:\s+([^\s`;&|]+))?/gu)) {
      references.push({
        command : commandMatch[0],
        first   : commandMatch[1],
        second  : commandMatch[2]
      });
    }
  }

  return references;
}

function identityPattern(identity) {
  const escaped = identity.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, 'u');
}

async function validateGuidance(
  repositoryRoot = REPOSITORY_ROOT,
  {
    canonicalRoots = CANONICAL_ROOTS,
    requiredPaths = REQUIRED_PATHS,
    requiredToolAssetPaths = REQUIRED_TOOL_ASSET_PATHS,
    skillRoots = SKILL_ROOTS,
    toolAssetRoots = TOOL_ASSET_ROOTS,
  } = {}
) {
  const rootPath = path.resolve(repositoryRoot);
  const errors   = [];

  for (const requiredPath of requiredPaths) {
    const absolutePath = path.join(rootPath, requiredPath);
    let entry;
    try {
      entry = await fs.lstat(absolutePath);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
        throw error;
      }
    }

    if (!entry) {
      errors.push(`Required guidance path is missing: ${requiredPath}.`);
      continue;
    }

    const expectedFile = path.extname(requiredPath) !== '';
    if (
      entry.isSymbolicLink()
      || (expectedFile && !entry.isFile())
      || (!expectedFile && !entry.isDirectory())
    ) {
      errors.push(
        `Required guidance path must be a ${expectedFile ? 'file' : 'directory'}: ${requiredPath}.`,
      );
    }
  }

  for (const legacyPath of FORBIDDEN_ROOT_PATHS) {
    if (await forbiddenPathHasContent(path.join(rootPath, legacyPath))) {
      errors.push(`Legacy guidance source must be removed: ${legacyPath}.`);
    }
  }

  const rootAgentRulesPath  = path.join(rootPath, 'AGENTS.md');
  const rootAgentRulesEntry = await fs.lstat(rootAgentRulesPath).catch((error) => {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return undefined;
    throw error;
  });
  if (rootAgentRulesEntry?.isFile()) {
    const rootAgentRules = await fs.readFile(rootAgentRulesPath, 'utf8');
    if (!isCurrentNextAgentRules(rootAgentRules)) {
      errors.push('Root AGENTS.md must contain only the current framework-managed agent-rules block.');
    }
  }

  const expectedToolAssetPaths = new Set(requiredToolAssetPaths);
  const toolAssetEntries       = await collectToolAssetEntries(
    rootPath,
    toolAssetRoots,
  );

  for (const filePath of toolAssetEntries.files) {
    if (!expectedToolAssetPaths.has(filePath)) {
      errors.push(`Unexpected curated guidance file: ${filePath}.`);
    }
  }

  for (const symbolicLink of toolAssetEntries.symbolicLinks) {
    errors.push(`Curated guidance trees must not contain symbolic links: ${symbolicLink}.`);
  }

  for (const unsupportedEntry of toolAssetEntries.unsupportedEntries) {
    errors.push(`Curated guidance tree contains an unsupported entry type: ${unsupportedEntry}.`);
  }

  errors.push(...await validateSkillParity(rootPath, skillRoots));

  let rootManifest = {};
  try {
    rootManifest = JSON.parse(await fs.readFile(path.join(rootPath, 'package.json'), 'utf8'));
  } catch (error) {
    errors.push(`package.json could not be read as JSON: ${error.message}`);
  }
  const rootScripts = new Set(Object.keys(rootManifest.scripts ?? {}));

  const canonicalFiles = await collectCanonicalFiles(rootPath, canonicalRoots);

  for (const filePath of canonicalFiles) {
    const relativePath = path.relative(rootPath, filePath);
    const basename     = path.basename(filePath).toLowerCase();

    if (basename === 'minime.md' || basename === 'minimi.md') {
      errors.push(`Legacy guidance filename must be renamed to CONTEXT.md: ${relativePath}.`);
    }

    const extension = path.extname(filePath).toLowerCase();
    if (!GUIDANCE_TEXT_EXTENSIONS.has(extension)) {
      continue;
    }

    const sourceText = await fs.readFile(filePath, 'utf8');
    if (sourceText.includes('\0')) {
      continue;
    }

    for (const identity of DENIED_IDENTITIES) {
      if (identityPattern(identity).test(sourceText)) {
        errors.push(`Denied placeholder identity ${identity} appears in ${relativePath}.`);
      }
    }

    if (extension !== '.md' && extension !== '.mdc') {
      continue;
    }

    for (const target of extractMarkdownLinks(sourceText)) {
      const resolvedPath = localLinkPath(rootPath, filePath, target);
      if (!resolvedPath) {
        continue;
      }

      if (!isInside(rootPath, resolvedPath) || !await pathExists(resolvedPath)) {
        errors.push(`Broken local Markdown link in ${relativePath}: ${target}.`);
      }
    }

    for (const reference of commandReferences(sourceText)) {
      let scriptName;

      if (reference.first === 'run') {
        scriptName = reference.second;
        if (!scriptName) {
          errors.push(`Incomplete pnpm run command in ${relativePath}: ${reference.command}.`);
          continue;
        }
      } else if (PNPM_BUILT_INS.has(reference.first)) {
        continue;
      } else {
        scriptName = reference.first;
      }

      if (!rootScripts.has(scriptName)) {
        errors.push(`Unknown root package script in ${relativePath}: pnpm ${scriptName}.`);
      }
    }
  }

  return errors;
}

async function main() {
  if (process.argv.length !== 2) {
    console.error('guidance: This checker does not accept arguments.');
    process.exitCode = 2;
    return;
  }

  const errors = await validateGuidance();
  for (const error of errors) {
    console.error(`guidance: ${error}`);
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
  CANONICAL_ROOTS,
  DENIED_IDENTITIES,
  FORBIDDEN_ROOT_PATHS,
  NEXT_AGENT_RULES_BLOCK,
  NEXT_AGENT_RULES_END_MARKER,
  NEXT_AGENT_RULES_START_MARKER,
  PNPM_BUILT_INS,
  REQUIRED_TOOL_ASSET_PATHS,
  REQUIRED_PATHS,
  REPOSITORY_ROOT,
  SKILL_ROOTS,
  TOOL_ASSET_ROOTS,
  collectCanonicalFiles,
  collectSkillContents,
  collectToolAssetEntries,
  commandReferences,
  extractMarkdownLinks,
  forbiddenPathHasContent,
  isCurrentNextAgentRules,
  skillFrontmatter,
  validateGuidance,
  validateSkillParity,
  withoutFencedCode,
};
