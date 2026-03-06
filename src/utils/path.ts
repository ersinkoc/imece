/**
 * Path utilities for imece
 * Handles encoding/decoding of file paths for lock files
 */

import { resolve, relative } from 'path';

/**
 * Encode a file path for use as a lock filename
 * Replaces path separators with safe characters, escapes existing underscores
 * @param filePath - Original file path
 * @returns Encoded path like "src_S_api_S_users.ts"
 * @example
 * encodePath('src/api/users.ts') // "src_S_api_S_users.ts"
 * encodePath('./src/api/users.ts') // "src_S_api_S_users.ts"
 */
export function encodePath(filePath: string): string {
  // Remove leading ./ or /
  const normalized = filePath.replace(/^[./\\]+/, '');
  // Escape existing _S_ sequences first, then replace separators
  return normalized
    .replace(/_S_/g, '_U_S_U_')
    .replace(/[/\\]/g, '_S_');
}

/**
 * Decode an encoded path back to file path
 * @param encoded - Encoded path
 * @returns Original file path like "src/api/users.ts"
 * @example
 * decodePath('src_S_api_S_users.ts') // "src/api/users.ts"
 */
export function decodePath(encoded: string): string {
  return encoded
    .replace(/_S_/g, '/')
    .replace(/_U_\/_U_/g, '_S_');
}

/**
 * Validate that a file path stays within the project root
 * @param filePath - File path to validate
 * @param projectRoot - Project root directory
 * @returns Normalized relative path
 * @throws Error if path escapes project root
 */
export function validateFilePath(filePath: string, projectRoot: string): string {
  const resolved = resolve(projectRoot, filePath);
  const rel = relative(projectRoot, resolved);
  if (rel.startsWith('..')) {
    throw new Error(`Path '${filePath}' escapes project root`);
  }
  return rel;
}

/**
 * Sanitize agent name to valid format
 * @param name - Raw agent name
 * @returns Sanitized name: lowercase, alphanumeric + hyphens, max 20 chars
 * @example
 * sanitizeAgentName('Ali_Yilmaz') // "ali-yilmaz"
 * sanitizeAgentName('Test Agent 123!') // "test-agent-123"
 */
export function sanitizeAgentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);
}

/**
 * Validate agent name format
 * @param name - Agent name to validate
 * @throws Error if name is invalid
 * @example
 * validateAgentName('ali') // ok
 * validateAgentName('Ali') // throws
 * validateAgentName('ali_test') // throws
 */
export function validateAgentName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Agent name cannot be empty');
  }
  if (name.length > 20) {
    throw new Error(`Agent name '${name}' exceeds 20 characters`);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(
      `Agent name '${name}' contains invalid characters. Use lowercase letters, numbers, and hyphens only.`
    );
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    throw new Error(`Agent name '${name}' cannot start or end with hyphen`);
  }
}

/**
 * Get lock filename for a file path
 * @param filePath - Original file path
 * @returns Lock filename like "src__api__users.ts.lock.json"
 * @example
 * getLockFilename('src/api/users.ts') // "src__api__users.ts.lock.json"
 */
export function getLockFilename(filePath: string): string {
  return `${encodePath(filePath)}.lock.json`;
}
