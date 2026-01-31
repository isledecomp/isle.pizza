#!/usr/bin/env node
// Sets up LEGO game assets via symlinks for isle.pizza development

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';

// Expand ~ to home directory
function expandTilde(filePath) {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

// Required files with correct case (relative to LEGO folder)
const REQUIRED_FILES = [
  // Data files
  'data/ACT1INF.DTA',
  'data/ACT2INF.DTA',
  'data/ACT3INF.DTA',
  'data/BLDDINF.DTA',
  'data/BLDHINF.DTA',
  'data/BLDJINF.DTA',
  'data/BLDRINF.DTA',
  'data/GMAININF.DTA',
  'data/HOSPINF.DTA',
  'data/ICUBEINF.DTA',
  'data/IELEVINF.DTA',
  'data/IISLEINF.DTA',
  'data/IMAININF.DTA',
  'data/IREGINF.DTA',
  'data/OBSTINF.DTA',
  'data/PMAININF.DTA',
  'data/RACCINF.DTA',
  'data/RACJINF.DTA',
  'data/WORLD.WDB',
  'data/testinf.dta',
  // Script files - root
  'Scripts/CREDITS.SI',
  'Scripts/INTRO.SI',
  'Scripts/NOCD.SI',
  'Scripts/SNDANIM.SI',
  // Script files - subdirectories
  'Scripts/Act2/ACT2MAIN.SI',
  'Scripts/Act3/ACT3.SI',
  'Scripts/Build/COPTER.SI',
  'Scripts/Build/DUNECAR.SI',
  'Scripts/Build/JETSKI.SI',
  'Scripts/Build/RACECAR.SI',
  'Scripts/Garage/GARAGE.SI',
  'Scripts/Hospital/HOSPITAL.SI',
  'Scripts/Infocntr/ELEVBOTT.SI',
  'Scripts/Infocntr/HISTBOOK.SI',
  'Scripts/Infocntr/INFODOOR.SI',
  'Scripts/Infocntr/INFOMAIN.SI',
  'Scripts/Infocntr/INFOSCOR.SI',
  'Scripts/Infocntr/REGBOOK.SI',
  'Scripts/Isle/ISLE.SI',
  'Scripts/Isle/JUKEBOX.SI',
  'Scripts/Isle/JUKEBOXW.SI',
  'Scripts/Police/POLICE.SI',
  'Scripts/Race/CARRACE.SI',
  'Scripts/Race/CARRACER.SI',
  'Scripts/Race/JETRACE.SI',
  'Scripts/Race/JETRACER.SI',
];

// Optional folders - files in these folders are symlinked if present
const OPTIONAL_FOLDERS = ['extra', 'textures'];

const TARGET_DIR = path.join(process.cwd(), 'LEGO');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let sourcePath = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' || args[i] === '-p') {
      sourcePath = args[i + 1];
      i++;
    } else if (args[i] === '--force' || args[i] === '-f') {
      force = true;
    } else if (args[i].startsWith('--path=')) {
      sourcePath = args[i].slice(7);
    }
  }

  return { sourcePath, force };
}

// Create readline interface for prompts
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt user for source path
async function promptForPath(rl) {
  return new Promise((resolve) => {
    rl.question('Enter path to your LEGO Island installation or mounted ISO: ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Prompt user for confirmation
async function confirmDeletion(rl) {
  return new Promise((resolve) => {
    rl.question('Existing LEGO folder found. Delete and recreate? (y/N): ', (answer) => {
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// Check if path exists
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Recursively scan directory and build case-insensitive file map by filename
// Also collects files from optional folders (extra, textures)
async function buildSourceFileMap(sourcePath) {
  const fileMap = new Map();
  const optionalFiles = { extra: [], textures: [] };

  async function scanDir(dirPath, inOptionalFolder = null) {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryFullPath = path.join(dirPath, entry.name);
      const entryNameLower = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        // Check if this directory is an optional folder
        let optFolder = inOptionalFolder;
        if (!optFolder && (entryNameLower === 'extra' || entryNameLower === 'textures')) {
          optFolder = entryNameLower;
        }
        await scanDir(entryFullPath, optFolder);
      } else if (entry.isFile()) {
        // Store lowercase filename as key, actual full path as value
        fileMap.set(entryNameLower, entryFullPath);

        // Track files in optional folders
        if (inOptionalFolder) {
          optionalFiles[inOptionalFolder].push({
            filename: entry.name,
            fullPath: entryFullPath,
          });
        }
      }
    }
  }

  await scanDir(sourcePath);
  return { fileMap, optionalFiles };
}

// Find matching file in source map by filename (case-insensitive)
function findMatchingFile(fileMap, targetRelativePath) {
  // Extract just the filename from the target path
  const filename = path.basename(targetRelativePath).toLowerCase();
  return fileMap.get(filename) || null;
}

// Remove existing LEGO folder
async function removeExistingLEGO() {
  if (await pathExists(TARGET_DIR)) {
    await fs.rm(TARGET_DIR, { recursive: true, force: true });
  }
}

// Create directory structure
async function createDirectoryStructure() {
  const dirs = new Set();

  for (const file of REQUIRED_FILES) {
    const dir = path.dirname(file);
    if (dir !== '.') {
      dirs.add(dir);
    }
  }

  for (const dir of dirs) {
    await fs.mkdir(path.join(TARGET_DIR, dir), { recursive: true });
  }
}

// Create symlinks for all required files
async function createSymlinks(fileMap) {
  const missing = [];
  const created = [];

  for (const targetRelPath of REQUIRED_FILES) {
    const sourcePath = findMatchingFile(fileMap, targetRelPath);

    if (!sourcePath) {
      missing.push(targetRelPath);
      continue;
    }

    const targetPath = path.join(TARGET_DIR, targetRelPath);

    try {
      await fs.symlink(sourcePath, targetPath);
      created.push({ target: targetRelPath, source: sourcePath });
    } catch (err) {
      if (err.code === 'EPERM' && process.platform === 'win32') {
        console.error(`\nError: Cannot create symlink (Windows requires Developer Mode or admin privileges)`);
        console.error(`  Enable Developer Mode: Settings -> Update & Security -> For Developers`);
        process.exit(3);
      }
      throw err;
    }
  }

  return { missing, created };
}

// Create symlinks for optional files (extra, textures folders)
async function createOptionalSymlinks(optionalFiles) {
  const created = [];

  for (const folder of OPTIONAL_FOLDERS) {
    const files = optionalFiles[folder] || [];
    if (files.length === 0) continue;

    // Create the optional folder
    const folderPath = path.join(TARGET_DIR, folder);
    await fs.mkdir(folderPath, { recursive: true });

    for (const { filename, fullPath } of files) {
      const targetRelPath = `${folder}/${filename}`;
      const targetPath = path.join(TARGET_DIR, targetRelPath);

      try {
        await fs.symlink(fullPath, targetPath);
        created.push({ target: targetRelPath, source: fullPath });
      } catch (err) {
        if (err.code === 'EPERM' && process.platform === 'win32') {
          console.error(`\nError: Cannot create symlink (Windows requires Developer Mode or admin privileges)`);
          console.error(`  Enable Developer Mode: Settings -> Update & Security -> For Developers`);
          process.exit(3);
        }
        throw err;
      }
    }
  }

  return created;
}

// Main entry point
async function main() {
  console.log('LEGO Island Asset Setup\n');

  const { sourcePath: argPath, force } = parseArgs();
  const rl = createReadline();

  try {
    // Get source path
    let sourcePath = argPath;
    if (!sourcePath) {
      sourcePath = await promptForPath(rl);
    }

    if (!sourcePath) {
      console.error('Error: No source path provided');
      process.exit(1);
    }

    sourcePath = path.resolve(expandTilde(sourcePath));

    // Validate source path
    if (!await pathExists(sourcePath)) {
      console.error(`Error: Source path does not exist: ${sourcePath}`);
      process.exit(1);
    }

    console.log(`Source: ${sourcePath}`);
    console.log(`Target: ${TARGET_DIR}\n`);

    // Build case-insensitive file map from source
    console.log('Scanning source directory...');
    const { fileMap, optionalFiles } = await buildSourceFileMap(sourcePath);
    console.log(`Found ${fileMap.size} files\n`);

    // Check all required files exist before making any changes
    const missing = REQUIRED_FILES.filter(f => !findMatchingFile(fileMap, f));
    if (missing.length > 0) {
      console.error('Error: The following required files were not found:\n');
      missing.forEach(f => console.error(`  - ${f}`));
      console.error('\nPlease ensure your source path points to a valid LEGO Island installation or mounted ISO.');
      process.exit(2);
    }

    // Check if LEGO folder exists and confirm deletion
    if (await pathExists(TARGET_DIR)) {
      if (!force) {
        const confirmed = await confirmDeletion(rl);
        if (!confirmed) {
          console.log('Aborted.');
          process.exit(0);
        }
      }
      console.log('Removing existing LEGO folder...');
      await removeExistingLEGO();
    }

    // Create directory structure
    console.log('Creating directory structure...');
    await createDirectoryStructure();

    // Create symlinks for required files
    console.log('Creating symlinks for required files...\n');
    const result = await createSymlinks(fileMap);

    for (const { target, source } of result.created) {
      console.log(`  ${target} -> ${source}`);
    }

    // Create symlinks for optional files (extra, textures)
    console.log('\nCreating symlinks for optional files...\n');
    const optionalCreated = await createOptionalSymlinks(optionalFiles);

    if (optionalCreated.length > 0) {
      for (const { target, source } of optionalCreated) {
        console.log(`  ${target} -> ${source}`);
      }
    } else {
      console.log('  (no optional files found)');
    }

    const totalCreated = result.created.length + optionalCreated.length;
    console.log(`\nSetup complete! Created ${totalCreated} symlinks (${result.created.length} required, ${optionalCreated.length} optional).`);
    console.log('You can now run `npm run dev`.');

  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
