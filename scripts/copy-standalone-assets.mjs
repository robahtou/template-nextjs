import { promises as fs } from 'node:fs';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';


const SCRIPT_DIRECTORY      = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT       = path.resolve(SCRIPT_DIRECTORY, '..');
const STANDALONE_DIRECTORY  = path.join(REPOSITORY_ROOT, '.next', 'standalone');
const ASSET_DIRECTORIES     = [
  {
    source     : path.join(REPOSITORY_ROOT, 'public'),
    destination: path.join(STANDALONE_DIRECTORY, 'public')
  },
  {
    source     : path.join(REPOSITORY_ROOT, '.next', 'static'),
    destination: path.join(STANDALONE_DIRECTORY, '.next', 'static')
  }
];

async function readDirectoryIfPresent(directoryPath) {
  try {
    const entry = await fs.lstat(directoryPath);
    if (!entry.isDirectory()) {
      throw new Error(`Expected a directory at ${directoryPath}.`);
    }
    return entry;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function copyDirectoryIfPresent({
  source,
  destination
}) {
  if (!await readDirectoryIfPresent(source)) {
    return;
  }

  await fs.rm(destination, {
    force    : true,
    recursive: true
  });
  await fs.mkdir(path.dirname(destination), {
    recursive: true
  });
  await fs.cp(source, destination, {
    force    : true,
    recursive: true
  });

  console.log(
    `copy-standalone-assets: copied ${path.relative(REPOSITORY_ROOT, source)}`
  );
}

if (!await readDirectoryIfPresent(STANDALONE_DIRECTORY)) {
  throw new Error('Standalone output is missing. Run the production build first.');
}

for (const assetDirectory of ASSET_DIRECTORIES) {
  await copyDirectoryIfPresent(assetDirectory);
}
