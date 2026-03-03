/**
 * Test helpers for imece
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a temporary imece directory for testing
 * @returns Path to temporary directory
 * @example
 * const tempDir = await createTempImece();
 * const imece = new ImeceManager(tempDir);
 */
export async function createTempImece(): Promise<string> {
  const tempDir = join(process.cwd(), '.test-imece', `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up temporary directory
 * @param tempDir - Path to temporary directory
 * @example
 * await cleanup(tempDir);
 */
export async function cleanup(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors - sometimes Windows holds file handles
  }
}

/**
 * Wait for a specified duration
 * @param ms - Milliseconds to wait
 * @example
 * await sleep(100); // Wait 100ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a file exists
 * @param path - File path
 * @returns True if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
