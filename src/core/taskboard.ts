/**
 * TaskBoard - Task management and workflow
 * Inspired by Agent Teams TaskCreate/TaskUpdate
 */

import { writeJson, readJson, listJsonFiles, ensureDir, removeFile } from '../utils/fs.js';
import { now } from '../utils/time.js';
import { generateId, taskFilename } from '../utils/id.js';
import { validateAgentName } from '../utils/path.js';
import { validatePriority, validateTaskStatus } from '../utils/validate.js';
import type { ImeceTask, CreateTaskOptions, TaskStatus, Priority, TaskNote } from '../types.js';
import type { Timeline } from './timeline.js';
import type { Messenger } from './messenger.js';

const DEFAULT_PRIORITY: Priority = 'normal';

export class TaskBoard {
  private readonly tasksDir: string;
  private readonly timeline: Timeline;

  constructor(imeceDir: string, timeline: Timeline) {
    this.tasksDir = `${imeceDir}/tasks`;
    this.timeline = timeline;
  }

  private getTaskPath(status: TaskStatus, filename: string): string {
    return `${this.tasksDir}/${status}/${filename}`;
  }

  private async findTaskFile(taskId: string): Promise<{ path: string; status: TaskStatus; filename: string } | null> {
    const statuses: TaskStatus[] = ['pending', 'active', 'done', 'blocked'];

    for (const status of statuses) {
      const files = await listJsonFiles(`${this.tasksDir}/${status}`);
      const filename = files.find(f => f.includes(`_${taskId}_`));
      if (filename) {
        return { path: `${this.tasksDir}/${status}/${filename}`, status, filename };
      }
    }

    return null;
  }

  /**
   * Create a new task
   * @param options - Task creation options
   * @returns Created task
   * @example
   * const task = await tasks.create({
   *   createdBy: 'ali',
   *   assignedTo: 'zeynep',
   *   title: 'Write tests',
   *   description: 'Create unit tests...',
   *   priority: 'high',
   *   tags: ['testing']
   * });
   */
  async create(options: CreateTaskOptions): Promise<ImeceTask> {
    validateAgentName(options.createdBy);
    validateAgentName(options.assignedTo);

    if (options.description && options.description.length > 50_000) {
      throw new Error('Task description exceeds 50,000 character limit');
    }
    if (options.title.length > 500) {
      throw new Error('Task title exceeds 500 character limit');
    }

    const priority = options.priority ? validatePriority(options.priority) : DEFAULT_PRIORITY;

    const id = generateId();
    const timestamp = now();

    const task: ImeceTask = {
      id,
      createdBy: options.createdBy,
      assignedTo: options.assignedTo,
      title: options.title,
      description: options.description,
      acceptanceCriteria: options.acceptanceCriteria ?? [],
      priority,
      status: 'pending',
      blockedBy: options.blockedBy ?? [],
      createdAt: timestamp,
      startedAt: null,
      completedAt: null,
      notes: [],
      tags: options.tags ?? []
    };

    const filename = taskFilename(id, options.title);
    await ensureDir(`${this.tasksDir}/pending`);
    await writeJson(this.getTaskPath('pending', filename), task);

    await this.timeline.append({
      agent: options.createdBy,
      event: 'task:created',
      message: `Created task: ${options.title}`,
      data: { taskId: id, assignedTo: options.assignedTo }
    });

    return task;
  }

  /**
   * Claim a task for an agent
   * @param taskId - Task ID
   * @param agent - Agent claiming the task
   * @returns Updated task or null
   * @example
   * await tasks.claim('kx7f2', 'zeynep');
   */
  async claim(taskId: string, agent: string): Promise<ImeceTask | null> {
    validateAgentName(agent);

    const found = await this.findTaskFile(taskId);
    if (!found) return null;

    const task = await readJson<ImeceTask>(found.path);
    /* c8 ignore next */
    if (!task) return null;

    if (task.status === 'active') {
      throw new Error(`Task ${taskId} is already claimed`);
    }

    if (task.status === 'done') {
      throw new Error(`Task ${taskId} is already completed`);
    }

    // Check if unblocked
    if (!(await this.isUnblocked(taskId))) {
      throw new Error(`Task ${taskId} is blocked by dependencies`);
    }

    const oldStatus = task.status;
    task.status = 'active';
    task.assignedTo = agent;
    task.startedAt = now();

    const newFilename = taskFilename(taskId, task.title);
    await ensureDir(`${this.tasksDir}/active`);
    await writeJson(this.getTaskPath('active', newFilename), task);
    await removeFile(found.path);

    await this.timeline.append({
      agent,
      event: 'task:claimed',
      message: `Claimed task: ${task.title}`,
      data: { taskId, previousStatus: oldStatus }
    });

    return task;
  }

  /**
   * Complete a task
   * @param taskId - Task ID
   * @param note - Optional completion note
   * @returns Updated task or null
   * @example
   * await tasks.complete('kx7f2', 'All tests passing');
   */
  async complete(taskId: string, note?: string): Promise<ImeceTask | null> {
    const found = await this.findTaskFile(taskId);
    if (!found) return null;

    const task = await readJson<ImeceTask>(found.path);
    /* c8 ignore next */
    if (!task) return null;

    if (task.status === 'done') {
      throw new Error(`Task ${taskId} is already completed`);
    }

    task.status = 'done';
    task.completedAt = now();

    if (note) {
      task.notes.push({
        agent: task.assignedTo,
        timestamp: now(),
        text: note
      });
    }

    const newFilename = taskFilename(taskId, task.title);
    await ensureDir(`${this.tasksDir}/done`);
    await writeJson(this.getTaskPath('done', newFilename), task);
    await removeFile(found.path);

    await this.timeline.append({
      agent: task.assignedTo,
      event: 'task:completed',
      message: `Completed task: ${task.title}`,
      data: { taskId, completedBy: task.assignedTo }
    });

    return task;
  }

  /**
   * Block a task
   * @param taskId - Task ID
   * @param reason - Blocker reason
   * @returns Updated task or null
   * @example
   * await tasks.block('kx7f2', 'Waiting for API design');
   */
  async block(taskId: string, reason: string): Promise<ImeceTask | null> {
    const found = await this.findTaskFile(taskId);
    if (!found) return null;

    const task = await readJson<ImeceTask>(found.path);
    /* c8 ignore next */
    if (!task) return null;

    if (task.status === 'done') {
      throw new Error(`Cannot block completed task ${taskId}`);
    }

    if (task.status === 'blocked') {
      throw new Error(`Task ${taskId} is already blocked`);
    }

    task.status = 'blocked';
    task.notes.push({
      agent: task.assignedTo,
      timestamp: now(),
      text: `BLOCKED: ${reason}`
    });

    const newFilename = taskFilename(taskId, task.title);
    await ensureDir(`${this.tasksDir}/blocked`);
    await writeJson(this.getTaskPath('blocked', newFilename), task);
    await removeFile(found.path);

    await this.timeline.append({
      agent: task.assignedTo,
      event: 'task:blocked',
      message: `Blocked task: ${task.title} - ${reason}`,
      data: { taskId, reason }
    });

    return task;
  }

  /**
   * Unblock a task
   * @param taskId - Task ID
   * @returns Updated task or null
   * @example
   * await tasks.unblock('kx7f2');
   */
  async unblock(taskId: string): Promise<ImeceTask | null> {
    const found = await this.findTaskFile(taskId);
    if (!found) return null;

    const task = await readJson<ImeceTask>(found.path);
    /* c8 ignore next */
    if (!task) return null;

    if (task.status !== 'blocked') {
      throw new Error(`Task ${taskId} is not blocked`);
    }

    task.status = 'pending';
    task.notes.push({
      agent: task.assignedTo,
      timestamp: now(),
      text: 'UNBLOCKED'
    });

    const newFilename = taskFilename(taskId, task.title);
    await ensureDir(`${this.tasksDir}/pending`);
    await writeJson(this.getTaskPath('pending', newFilename), task);
    await removeFile(found.path);

    await this.timeline.append({
      agent: task.assignedTo,
      event: 'task:unblocked',
      message: `Unblocked task: ${task.title}`,
      data: { taskId }
    });

    return task;
  }

  /**
   * Add note to task
   * @param taskId - Task ID
   * @param agent - Agent adding note
   * @param text - Note text
   * @returns Updated task or null
   * @example
   * await tasks.addNote('kx7f2', 'zeynep', 'Started implementation');
   */
  async addNote(taskId: string, agent: string, text: string): Promise<ImeceTask | null> {
    validateAgentName(agent);

    const found = await this.findTaskFile(taskId);
    if (!found) return null;

    const task = await readJson<ImeceTask>(found.path);
    /* c8 ignore next */
    if (!task) return null;

    task.notes.push({
      agent,
      timestamp: now(),
      text
    });

    await writeJson(found.path, task);
    return task;
  }

  /**
   * List tasks by status
   * @param status - Task status to filter by
   * @returns Array of tasks
   * @example
   * const active = await tasks.listByStatus('active');
   */
  async listByStatus(status: TaskStatus): Promise<ImeceTask[]> {
    validateTaskStatus(status);
    const files = await listJsonFiles(`${this.tasksDir}/${status}`);
    const results = await Promise.all(
      files.map(f => readJson<ImeceTask>(`${this.tasksDir}/${status}/${f}`))
    );
    return results
      .filter((t): t is ImeceTask => t !== null)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  /**
   * Get all tasks
   * @returns Array of all tasks
   * @example
   * const all = await tasks.all();
   */
  async all(): Promise<ImeceTask[]> {
    const statuses: TaskStatus[] = ['pending', 'active', 'done', 'blocked'];
    const results = await Promise.all(statuses.map(s => this.listByStatus(s)));
    const all = results.flat();

    return all.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Find task by ID
   * @param taskId - Task ID
   * @returns Task or null
   * @example
   * const task = await tasks.find('kx7f2');
   */
  async find(taskId: string): Promise<ImeceTask | null> {
    const found = await this.findTaskFile(taskId);
    if (!found) return null;
    return readJson<ImeceTask>(found.path);
  }

  /**
   * Delegate task via messenger
   * @param task - Task to delegate
   * @param messenger - Messenger instance
   * @returns Sent message
   * @example
   * await tasks.delegate(task, messenger);
   */
  async delegate(task: ImeceTask, messenger: Messenger): Promise<import('../types.js').ImeceMessage> {
    const criteria = task.acceptanceCriteria.length > 0
      ? `\n\nAcceptance Criteria:\n${task.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`
      : '';

    const body = `${task.description}${criteria}\n\nPriority: ${task.priority}`;

    return messenger.send({
      from: task.createdBy,
      to: task.assignedTo,
      type: 'task-delegate',
      subject: task.title,
      body,
      priority: task.priority,
      expectsReply: true
    });
  }

  /**
   * Get tasks assigned to agent
   * @param agent - Agent name
   * @returns Array of tasks
   * @example
   * const myTasks = await tasks.getAgentTasks('zeynep');
   */
  async getAgentTasks(agent: string): Promise<ImeceTask[]> {
    validateAgentName(agent);
    const all = await this.all();
    return all.filter(t => t.assignedTo === agent);
  }

  /**
   * Check if task dependencies are satisfied
   * @param taskId - Task ID
   * @returns True if unblocked
   * @example
   * if (await tasks.isUnblocked('kx7f2')) { ... }
   */
  async isUnblocked(taskId: string): Promise<boolean> {
    const task = await this.find(taskId);
    if (!task) return false;

    if (task.blockedBy.length === 0) return true;

    for (const depId of task.blockedBy) {
      const dep = await this.find(depId);
      if (!dep || dep.status !== 'done') {
        return false;
      }
    }

    return true;
  }
}
