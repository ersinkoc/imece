/**
 * Timestamp utilities
 * All timestamps in UTC ISO 8601 format
 */

/**
 * Get current timestamp in UTC ISO 8601 format
 * @returns ISO 8601 timestamp like "2026-03-03T11:45:00.000Z"
 * @example
 * now() // "2026-03-03T11:45:30.123Z"
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Convert ISO timestamp to relative time string
 * @param isoTimestamp - ISO 8601 timestamp
 * @returns Human-readable relative time like "2 min ago"
 * @example
 * relative('2026-03-03T11:43:00.000Z') // "2 min ago"
 * relative('2026-03-03T10:00:00.000Z') // "1 hour ago"
 */
export function relative(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const nowMs = Date.now();
  const diffMs = nowMs - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} sec ago`;
  if (diffMin < 2) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 2) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay < 2) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;

  return date.toLocaleDateString();
}

/**
 * Check if timestamp is older than threshold
 * @param isoTimestamp - ISO 8601 timestamp
 * @param thresholdSeconds - Threshold in seconds
 * @returns True if timestamp is older than threshold
 * @example
 * isStale('2026-03-03T11:00:00.000Z', 300) // true if more than 5 min old
 */
export function isStale(isoTimestamp: string, thresholdSeconds: number): boolean {
  const date = new Date(isoTimestamp);
  const diffMs = Date.now() - date.getTime();
  return diffMs > thresholdSeconds * 1000;
}

/**
 * Format timestamp for display
 * @param isoTimestamp - ISO 8601 timestamp
 * @returns Formatted string like "Mar 3, 11:45"
 * @example
 * formatTime('2026-03-03T11:45:00.000Z') // "Mar 3, 11:45"
 */
export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
