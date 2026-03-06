/**
 * UI utilities for CLI
 * Zero dependencies - uses ANSI codes directly
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI COLOR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

export const icons = {
  // Agent status
  online: '🟢',
  busy: '🟡',
  idle: '🔵',
  waiting: '⏳',
  offline: '🔴',

  // Other icons
  inboxNew: '📬',
  inboxEmpty: '📭',
  task: '📋',
  done: '✅',
  active: '🔄',
  blocked: '🚫',
  broadcast: '📢',
  urgent: '🚨',
  lock: '🔒',
  unlock: '🔓',
  lead: '👑',
  message: '💬',
  arrow: '→',
  bullet: '•',
  check: '✓',
  cross: '✗',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BOX DRAWING
// ═══════════════════════════════════════════════════════════════════════════════

const boxChars = {
  h: '─',
  v: '│',
  tl: '╭',
  tr: '╮',
  bl: '╰',
  br: '╯',
} as const;

/**
 * Create a box around content
 * @param title - Box title
 * @param content - Box content
 * @returns Formatted box string
 */
export function box(title: string, content: string): string {
  const width = Math.max(title.length + 4, 50);
  const lines = content.split('\n');

  const top = `${boxChars.tl}${boxChars.h.repeat(width - 2)}${boxChars.tr}`;
  const titleLine = `${boxChars.v} ${colors.bold}${title}${colors.reset}${' '.repeat(width - title.length - 3)}${boxChars.v}`;
  const separator = `${boxChars.v}${boxChars.h.repeat(width - 2)}${boxChars.v}`;
  const bottom = `${boxChars.bl}${boxChars.h.repeat(width - 2)}${boxChars.br}`;

  const contentLines = lines.map(line =>
    `${boxChars.v} ${line}${' '.repeat(Math.max(0, width - line.length - 3))}${boxChars.v}`
  );

  return [top, titleLine, separator, ...contentLines, bottom].join('\n');
}

/**
 * Create a table
 * @param headers - Column headers
 * @param rows - Table rows
 * @returns Formatted table string
 */
export function table(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const headerWidth = stripAnsi(h).length;
    const maxDataWidth = Math.max(...rows.map(r => stripAnsi(r[i] ?? '').length));
    return Math.max(headerWidth, maxDataWidth) + 2;
  });

  const totalWidth = colWidths.reduce((a, b) => a + b, 1);

  // Build separator lines
  const topLine = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐';
  const headerLine = '│' + headers.map((h, i) => ` ${h}${' '.repeat(colWidths[i]! - stripAnsi(h).length - 1)}`).join('│') + '│';
  const separator = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
  const bottomLine = '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

  // Build data rows
  const dataRows = rows.map(row =>
    '│' + row.map((cell, i) => ` ${cell}${' '.repeat(colWidths[i]! - stripAnsi(cell).length - 1)}`).join('│') + '│'
  );

  return [topLine, headerLine, separator, ...dataRows, bottomLine].join('\n');
}

/**
 * Create a divider line
 * @param char - Character to use
 * @param width - Line width
 * @returns Divider string
 */
export function divider(char = '─', width = 50): string {
  return char.repeat(width);
}

/**
 * Create a colored badge
 * @param text - Badge text
 * @param color - Badge color
 * @returns Formatted badge
 */
export function badge(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format agent status with icon
 * @param status - Agent status
 * @returns Formatted status string
 */
export function formatStatus(status: string): string {
  const icon = icons[status as keyof typeof icons] ?? icons.offline;
  const color =
    status === 'online' ? colors.green :
    status === 'busy' ? colors.yellow :
    status === 'idle' ? colors.blue :
    status === 'waiting' ? colors.cyan :
    colors.gray;
  return `${icon} ${color}${status}${colors.reset}`;
}

/**
 * Format priority with color
 * @param priority - Priority level
 * @returns Formatted priority string
 */
export function formatPriority(priority: string): string {
  const color =
    priority === 'urgent' ? colors.red :
    priority === 'high' ? colors.yellow :
    priority === 'normal' ? colors.blue :
    colors.gray;
  return `${color}${priority}${colors.reset}`;
}

/**
 * Format relative time - delegates to shared utility
 */
export { relative as formatRelativeTime } from '../utils/time.js';

/**
 * Strip ANSI codes from string
 * @param str - String with ANSI codes
 * @returns Clean string
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Print success message
 * @param message - Message to print
 */
export function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Print error message
 * @param message - Message to print
 */
export function error(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Print warning message
 * @param message - Message to print
 */
export function warning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

/**
 * Print info message
 * @param message - Message to print
 */
export function info(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}
