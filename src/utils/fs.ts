/**
 * Safe file operations with atomic writes
 * All operations are async and use Node.js built-in APIs only
 */

import { promises as fs, constants } from 'fs';
import { dirname, join } from 'path';
import { generateId } from './id.js';

/**
 * Read JSON file safely
 * @param filePath - Path to JSON file
 * @returns Parsed JSON or null if file doesn't exist or is invalid
 * @example
 * const data = await readJson<{ name: string }>('config.json');
 * if (data) console.log(data.name);
 */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON file atomically using temp+rename pattern
 * @param filePath - Target file path
 * @param data - Data to serialize
 * @example
 * await writeJson('config.json', { name: 'test', value: 123 });
 */
export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp.${generateId()}`;
  await ensureDir(dirname(filePath));
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    /* c8 ignore next */
    // On Windows, rename can fail if target exists. Fallback to direct write.
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      await fs.unlink(tmpPath).catch(() => {});
    } else {
      throw error;
    }
  }
}

/**
 * Append line to JSONL file
 * @param filePath - Path to JSONL file
 * @param data - Data to append
 * @example
 * await appendJsonl('events.jsonl', { event: 'click', time: Date.now() });
 */
export async function appendJsonl<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(dirname(filePath));
  const line = JSON.stringify(data) + '\n';
  await fs.appendFile(filePath, line, 'utf8');
}

/**
 * Read JSONL file, optionally limited to last N lines
 * @param filePath - Path to JSONL file
 * @param limit - Optional limit (returns last N lines)
 * @returns Array of parsed JSON objects
 * @example
 * const events = await readJsonl<Event>('events.jsonl', 100);
 */
export async function readJsonl<T>(filePath: string, limit?: number): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const toParse = limit ? lines.slice(-limit) : lines;

    const results: T[] = [];
    for (const line of toParse) {
      try {
        results.push(JSON.parse(line) as T);
      } catch {
        // Skip invalid lines
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * List JSON files in directory (non-recursive)
 * @param dirPath - Directory to list
 * @returns Array of JSON filenames
 * @example
 * const files = await listJsonFiles('./agents');
 * // ['ali.json', 'zeynep.json']
 */
export async function listJsonFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.endsWith('.json'))
      .map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Move file from one location to another
 * Creates target directory if needed
 * @param from - Source path
 * @param to - Destination path
 * @example
 * await moveFile('./tmp/file.json', './agents/file.json');
 */
export async function moveFile(from: string, to: string): Promise<void> {
  await ensureDir(dirname(to));
  await fs.rename(from, to);
}

/**
 * Ensure directory exists, creating if necessary
 * @param dirPath - Directory path
 * @example
 * await ensureDir('./agents/inbox');
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    /* c8 ignore next */
    // Directory may already exist
  }
}

/**
 * Check if path exists
 * @param path - Path to check
 * @returns True if path exists
 * @example
 * if (await exists('./config.json')) { ... }
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove file if it exists
 * @param filePath - Path to file
 * @example
 * await removeFile('./old.json');
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

/**
 * Read directory contents
 * @param dirPath - Directory path
 * @returns Array of entries or empty array if error
 * @example
 * const entries = await readDir('./agents');
 */
export async function readDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

/**
 * Remove directory recursively
 * @param dirPath - Directory to remove
 * @example
 * await removeDir('./tmp');
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    /* c8 ignore next */
    // Directory may not exist
  }
}

/**
 * Copy file
 * @param from - Source path
 * @param to - Destination path
 * @example
 * await copyFile('./template.json', './output.json');
 */
export async function copyFile(from: string, to: string): Promise<void> {
  await ensureDir(dirname(to));
  await fs.copyFile(from, to);
}
