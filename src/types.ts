// ═══════════════════════════════════════════════════════════════════════════════
// İMECE TYPES
// Universal multi-agent coordination protocol for AI code assistants
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════
// AGENT
// ═══════════════════════════════════════

/**
 * Agent status lifecycle
 * @example 'online' | 'busy' | 'idle' | 'waiting' | 'offline'
 */
export type AgentStatus = 'online' | 'busy' | 'idle' | 'waiting' | 'offline';

/**
 * Agent profile - identity and state of an AI assistant in the swarm
 * @example
 * {
 *   name: 'ali',
 *   role: 'lead-architect',
 *   capabilities: ['architecture', 'api-design', 'review'],
 *   status: 'busy',
 *   currentTask: 'task_kx7f2',
 *   model: 'claude-opus-4-6',
 *   registeredAt: '2026-03-03T10:30:00.000Z',
 *   lastSeen: '2026-03-03T11:45:00.000Z',
 *   filesWorkingOn: ['src/api/users.ts'],
 *   isLead: true,
 *   meta: { preferredEditor: 'vim' }
 * }
 */
export interface AgentProfile {
  /** Lowercase, alphanumeric + hyphens, max 20 chars */
  name: string;
  /** Role description e.g., 'lead-architect', 'frontend-dev' */
  role: string;
  /** List of capabilities e.g., ['react', 'testing', 'api-design'] */
  capabilities: string[];
  /** Current status in the lifecycle */
  status: AgentStatus;
  /** ID of current task or null */
  currentTask: string | null;
  /** AI model name or "human" */
  model: string;
  /** ISO 8601 UTC timestamp of registration */
  registeredAt: string;
  /** ISO 8601 UTC timestamp - updated on every action */
  lastSeen: string;
  /** Files currently being edited */
  filesWorkingOn: string[];
  /** Whether this agent is the team lead */
  isLead: boolean;
  /** Additional metadata */
  meta: Record<string, unknown>;
}

// ═══════════════════════════════════════
// MESSAGE
// ═══════════════════════════════════════

/**
 * Message types for different communication patterns
 */
export type MessageType =
  | 'message'        // General message
  | 'task-delegate'  // Task assignment
  | 'question'       // Question requiring answer
  | 'status-update'  // Status update
  | 'review-request' // Code review request
  | 'approval'       // Approval of work
  | 'rejection'      // Rejection with feedback
  | 'blocker'        // Blocking issue
  | 'handoff';       // Work handoff

/**
 * Priority levels for messages and tasks
 */
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Message structure for agent communication
 * @example
 * {
 *   id: 'kx7f2a3b',
 *   from: 'ali',
 *   to: 'zeynep',
 *   timestamp: '2026-03-03T11:45:00.000Z',
 *   type: 'task-delegate',
 *   subject: 'Review authentication module',
 *   body: 'Please review the new auth implementation...',
 *   priority: 'high',
 *   expectsReply: true,
 *   replyTo: null,
 *   read: false
 * }
 */
export interface ImeceMessage {
  /** base36 timestamp + random chars */
  id: string;
  /** Sender agent name */
  from: string;
  /** Recipient agent name */
  to: string;
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Message type */
  type: MessageType;
  /** Message subject/title */
  subject: string;
  /** Message body */
  body: string;
  /** Priority level */
  priority: Priority;
  /** Whether sender expects a reply */
  expectsReply: boolean;
  /** ID of message this is replying to, or null */
  replyTo: string | null;
  /** Whether message has been read */
  read: boolean;
}

// ═══════════════════════════════════════
// TASK
// ═══════════════════════════════════════

/**
 * Task status in Kanban workflow
 */
export type TaskStatus = 'pending' | 'active' | 'done' | 'blocked';

/**
 * Note added to a task
 */
export interface TaskNote {
  /** Agent who added the note */
  agent: string;
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Note text */
  text: string;
}

/**
 * Task structure for work tracking
 * @example
 * {
 *   id: 'task_kx7f2',
 *   createdBy: 'ali',
 *   assignedTo: 'zeynep',
 *   title: 'Write unit tests for user API',
 *   description: 'Create comprehensive tests...',
 *   acceptanceCriteria: ['90% coverage', 'Edge cases tested'],
 *   priority: 'high',
 *   status: 'active',
 *   blockedBy: [],
 *   createdAt: '2026-03-03T10:00:00.000Z',
 *   startedAt: '2026-03-03T10:30:00.000Z',
 *   completedAt: null,
 *   notes: [{ agent: 'zeynep', timestamp: '...', text: 'Started work' }],
 *   tags: ['testing', 'api']
 * }
 */
export interface ImeceTask {
  /** Unique task ID */
  id: string;
  /** Agent who created the task */
  createdBy: string;
  /** Agent assigned to the task */
  assignedTo: string;
  /** Task title */
  title: string;
  /** Detailed description */
  description: string;
  /** Acceptance criteria checklist */
  acceptanceCriteria: string[];
  /** Priority level */
  priority: Priority;
  /** Current status */
  status: TaskStatus;
  /** Task IDs that must complete first */
  blockedBy: string[];
  /** ISO 8601 UTC timestamp of creation */
  createdAt: string;
  /** ISO 8601 UTC timestamp when started, or null */
  startedAt: string | null;
  /** ISO 8601 UTC timestamp when completed, or null */
  completedAt: string | null;
  /** Notes added during work */
  notes: TaskNote[];
  /** Tags for categorization */
  tags: string[];
}

// ═══════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════

/**
 * Timeline event types for audit logging
 */
export type TimelineEventType =
  // Agent lifecycle
  | 'agent:join' | 'agent:leave' | 'agent:status'
  // Message events
  | 'message:sent' | 'message:read'
  // Task events
  | 'task:created' | 'task:claimed' | 'task:completed' | 'task:blocked' | 'task:unblocked'
  // File events
  | 'file:locked' | 'file:unlocked'
  // Other
  | 'broadcast' | 'error';

/**
 * Timeline event for append-only event log
 * @example
 * {
 *   timestamp: '2026-03-03T11:45:00.000Z',
 *   agent: 'ali',
 *   event: 'task:claimed',
 *   message: 'Claimed task: Review authentication module',
 *   data: { taskId: 'task_kx7f2' }
 * }
 */
export interface TimelineEvent {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Agent who triggered the event */
  agent: string;
  /** Event type */
  event: TimelineEventType;
  /** Human-readable message */
  message: string;
  /** Additional structured data */
  data?: Record<string, unknown> | undefined;
}

// ═══════════════════════════════════════
// FILE LOCK
// ═══════════════════════════════════════

/**
 * File lock for conflict prevention
 * @example
 * {
 *   file: 'src/api/users.ts',
 *   agent: 'ali',
 *   lockedAt: '2026-03-03T11:45:00.000Z',
 *   reason: 'Refactoring user validation'
 * }
 */
export interface FileLock {
  /** File path being locked */
  file: string;
  /** Agent who locked the file */
  agent: string;
  /** ISO 8601 UTC timestamp */
  lockedAt: string;
  /** Optional reason for locking */
  reason?: string | undefined;
}

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

/**
 * İmece settings
 */
export interface ImeceSettings {
  /** Seconds before agent considered stale (default: 300 = 5 min) */
  staleThresholdSeconds: number;
  /** Maximum number of agents allowed (default: 10) */
  maxAgents: number;
  /** Hours after which to cleanup old data (default: 24) */
  cleanupAfterHours: number;
}

/**
 * İmece configuration stored in imece.json
 * @example
 * {
 *   project: 'my-app',
 *   created: '2026-03-03T10:00:00.000Z',
 *   version: '1.0.0',
 *   description: 'Multi-agent coordination for my-app',
 *   settings: { staleThresholdSeconds: 300, maxAgents: 10, cleanupAfterHours: 24 }
 * }
 */
export interface ImeceConfig {
  /** Project name */
  project: string;
  /** ISO 8601 UTC timestamp of creation */
  created: string;
  /** İmece version */
  version: string;
  /** Optional project description */
  description?: string | undefined;
  /** Settings */
  settings: ImeceSettings;
}

// ═══════════════════════════════════════
// STATUS
// ═══════════════════════════════════════

/**
 * Aggregate status of the entire imece
 * @example
 * {
 *   config: { ... },
 *   agents: [...],
 *   taskSummary: { backlog: 3, active: 2, done: 5, blocked: 1 },
 *   activeTasks: [...],
 *   recentTimeline: [...],
 *   activeLocks: [...]
 * }
 */
export interface ImeceStatus {
  /** Configuration */
  config: ImeceConfig;
  /** All agent profiles */
  agents: AgentProfile[];
  /** Task counts by status */
  taskSummary: { backlog: number; active: number; done: number; blocked: number };
  /** Currently active tasks */
  activeTasks: ImeceTask[];
  /** Recent timeline events */
  recentTimeline: TimelineEvent[];
  /** Active file locks */
  activeLocks: FileLock[];
}

// ═══════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════

/** Options for agent registration */
export interface RegisterAgentOptions {
  name: string;
  role: string;
  capabilities?: string[] | undefined;
  model?: string | undefined;
  isLead?: boolean | undefined;
}

/** Options for sending a message */
export interface SendMessageOptions {
  from: string;
  to: string;
  type?: MessageType | undefined;
  subject: string;
  body: string;
  priority?: Priority | undefined;
  expectsReply?: boolean | undefined;
  replyTo?: string | null | undefined;
}

/** Options for creating a task */
export interface CreateTaskOptions {
  createdBy: string;
  assignedTo: string;
  title: string;
  description: string;
  acceptanceCriteria?: string[] | undefined;
  priority?: Priority | undefined;
  blockedBy?: string[] | undefined;
  tags?: string[] | undefined;
}

/** Options for status query */
export interface StatusOptions {
  timelineLimit?: number | undefined;
}
