/**
 * imece - Universal Multi-Agent Coordination for AI Code Assistants
 *
 * A file-based IPC system that lets multiple AI code assistants coordinate,
 * communicate, and delegate tasks on the same codebase.
 *
 * @example
 * import { ImeceManager } from 'imece';
 *
 * const imece = new ImeceManager();
 * await imece.init();
 *
 * const agent = await imece.agents.register({
 *   name: 'ali',
 *   role: 'lead-architect'
 * });
 *
 * await imece.messages.send({
 *   from: 'ali',
 *   to: 'zeynep',
 *   subject: 'Review PR #12',
 *   body: 'Please review...'
 * });
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE MANAGERS
// ═══════════════════════════════════════════════════════════════════════════════

export { ImeceManager } from './core/imece.js';
export { AgentManager } from './core/agent.js';
export { Messenger } from './core/messenger.js';
export { TaskBoard } from './core/taskboard.js';
export { Timeline } from './core/timeline.js';
export { FileLocker } from './core/locker.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Agent
  AgentProfile,
  AgentStatus,
  RegisterAgentOptions,

  // Message
  ImeceMessage,
  MessageType,
  SendMessageOptions,

  // Task
  ImeceTask,
  TaskStatus,
  TaskNote,
  CreateTaskOptions,

  // Timeline
  TimelineEvent,
  TimelineEventType,

  // Lock
  FileLock,

  // Config
  ImeceConfig,
  ImeceSettings,
  ImeceStatus,
  StatusOptions,

  // Common
  Priority,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  /** Generate unique IDs */
  generateId,
  messageFilename,
  taskFilename,
  extractId,
} from './utils/id.js';

export {
  /** Time utilities */
  now,
  relative,
  isStale,
  formatTime,
} from './utils/time.js';

export {
  /** Path utilities */
  encodePath,
  decodePath,
  sanitizeAgentName,
  validateAgentName,
  getLockFilename,
  validateFilePath,
} from './utils/path.js';

export {
  /** Validation utilities */
  validatePriority,
  validateMessageType,
  validateStatus,
  validateTaskStatus,
} from './utils/validate.js';

export {
  /** File system utilities */
  readJson,
  writeJson,
  appendJsonl,
  readJsonl,
  listJsonFiles,
  moveFile,
  ensureDir,
  exists,
  removeFile,
  readDir,
  removeDir,
  copyFile,
} from './utils/fs.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = '1.0.4';
