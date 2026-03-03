/**
 * ID generation utilities
 * Uses base36 timestamp + random suffix for sortable, unique IDs
 */

/**
 * Generate a unique ID based on timestamp and random chars
 * Format: base36(timestamp) + 4 random base36 chars
 * @returns Unique ID string like "kx7f2a3b"
 * @example
 * generateId() // "kx7f2a3b"
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}${random}`;
}

/**
 * Generate a message filename
 * @param id - Message ID
 * @param from - Sender agent name
 * @returns Filename like "msg_kx7f2_from_ali.json"
 * @example
 * messageFilename('kx7f2', 'ali') // "msg_kx7f2_from_ali.json"
 */
export function messageFilename(id: string, from: string): string {
  return `msg_${id}_from_${from}.json`;
}

/**
 * Generate a task filename
 * @param id - Task ID
 * @param title - Task title
 * @returns Filename like "task_kx7f2_review_auth.json"
 * @example
 * taskFilename('kx7f2', 'Review authentication') // "task_kx7f2_review_authentication.json"
 */
export function taskFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .substring(0, 30)
    .replace(/^_+|_+$/g, '');
  return `task_${id}_${slug}.json`;
}

/**
 * Extract ID from filename
 * @param filename - Filename to parse
 * @returns ID string or null if not found
 * @example
 * extractId('msg_kx7f2_from_ali.json') // "kx7f2"
 * extractId('task_kx7f2_review_auth.json') // "kx7f2"
 * extractId('invalid.txt') // null
 */
export function extractId(filename: string): string | null {
  // Match msg_ID_from_NAME.json or task_ID_NAME.json
  const match = filename.match(/(?:msg|task)_([a-z0-9]+)_/);
  return match?.[1] ?? null;
}
