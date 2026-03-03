/**
 * Input validation utilities
 * Validates priority, message types, statuses
 */
import type { Priority, MessageType, AgentStatus, TaskStatus } from '../types.js';

const VALID_PRIORITIES: readonly Priority[] = ['low', 'normal', 'high', 'urgent'];
const VALID_MESSAGE_TYPES: readonly MessageType[] = [
  'message', 'task-delegate', 'question', 'status-update',
  'review-request', 'approval', 'rejection', 'blocker', 'handoff'
];
const VALID_AGENT_STATUSES: readonly AgentStatus[] = ['online', 'busy', 'idle', 'waiting', 'offline'];
const VALID_TASK_STATUSES: readonly TaskStatus[] = ['pending', 'active', 'done', 'blocked'];

/**
 * Validate priority value
 * @param p - Priority to validate
 * @returns Valid priority
 * @throws Error if invalid
 * @example
 * validatePriority('high') // 'high'
 * validatePriority('invalid') // throws
 */
export function validatePriority(p: string): Priority {
  if (!VALID_PRIORITIES.includes(p as Priority)) {
    throw new Error(
      `Invalid priority '${p}'. Valid: ${VALID_PRIORITIES.join(', ')}`
    );
  }
  return p as Priority;
}

/**
 * Validate message type
 * @param t - Type to validate
 * @returns Valid message type
 * @throws Error if invalid
 * @example
 * validateMessageType('task-delegate') // 'task-delegate'
 * validateMessageType('invalid') // throws
 */
export function validateMessageType(t: string): MessageType {
  if (!VALID_MESSAGE_TYPES.includes(t as MessageType)) {
    throw new Error(
      `Invalid message type '${t}'. Valid: ${VALID_MESSAGE_TYPES.join(', ')}`
    );
  }
  return t as MessageType;
}

/**
 * Validate agent status
 * @param s - Status to validate
 * @returns Valid agent status
 * @throws Error if invalid
 * @example
 * validateStatus('busy') // 'busy'
 * validateStatus('invalid') // throws
 */
export function validateStatus(s: string): AgentStatus {
  if (!VALID_AGENT_STATUSES.includes(s as AgentStatus)) {
    throw new Error(
      `Invalid status '${s}'. Valid: ${VALID_AGENT_STATUSES.join(', ')}`
    );
  }
  return s as AgentStatus;
}

/**
 * Validate task status
 * @param s - Status to validate
 * @returns Valid task status
 * @throws Error if invalid
 * @example
 * validateTaskStatus('active') // 'active'
 * validateTaskStatus('invalid') // throws
 */
export function validateTaskStatus(s: string): TaskStatus {
  if (!VALID_TASK_STATUSES.includes(s as TaskStatus)) {
    throw new Error(
      `Invalid task status '${s}'. Valid: ${VALID_TASK_STATUSES.join(', ')}`
    );
  }
  return s as TaskStatus;
}
