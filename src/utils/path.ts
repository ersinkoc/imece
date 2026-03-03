/**
 * Path utilities for imece
 * Handles encoding/decoding of file paths for lock files
 */

/**
 * Encode a file path for use as a lock filename
 * Replaces path separators with safe characters
 * @param filePath - Original file path
 * @returns Encoded path like "src__api__users.ts"
 * @example
 * encodePath('src/api/users.ts') // "src__api__users.ts"
 * encodePath('./src/api/users.ts') // "src__api__users.ts"
 */
export function encodePath(filePath: string): string {
  // Remove leading ./ or /
  const normalized = filePath.replace(/^[./\\]+/, '');
  // Replace path separators with __
  return normalized.replace(/[/\\]/g, '__');
}

/**
 * Decode an encoded path back to file path
 * @param encoded - Encoded path
 * @returns Original file path like "src/api/users.ts"
 * @example
 * decodePath('src__api__users.ts') // "src/api/users.ts"
 */
export function decodePath(encoded: string): string {
  return encoded.replace(/__/g, '/');
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
