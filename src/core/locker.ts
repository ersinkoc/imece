/**
 * FileLocker - Advisory file locking for conflict prevention
 */

import { writeJson, readJson, listJsonFiles, removeFile, ensureDir } from '../utils/fs.js';
import { now, isStale } from '../utils/time.js';
import { encodePath, getLockFilename, validateAgentName, validateFilePath } from '../utils/path.js';
import type { FileLock, AgentProfile } from '../types.js';
import type { Timeline } from './timeline.js';

const DEFAULT_STALE_THRESHOLD = 3600; // 1 hour

export class FileLocker {
  private readonly locksDir: string;
  private readonly projectRoot: string;
  private readonly timeline: Timeline;

  constructor(imeceDir: string, timeline: Timeline) {
    this.locksDir = `${imeceDir}/locks`;
    this.projectRoot = imeceDir.replace(/[\\/]\.imece$/, '');
    this.timeline = timeline;
  }

  private getLockPath(filePath: string): string {
    return `${this.locksDir}/${getLockFilename(filePath)}`;
  }

  /**
   * Lock a file
   * @param agent - Agent locking the file
   * @param filePath - File path to lock
   * @param reason - Optional reason for locking
   * @returns File lock or null if already locked by another
   * @throws Error if file is locked by another agent
   * @example
   * await locker.lock('ali', 'src/api/users.ts', 'Refactoring validation');
   */
  async lock(agent: string, filePath: string, reason?: string): Promise<FileLock> {
    validateAgentName(agent);
    validateFilePath(filePath, this.projectRoot);

    const existing = await this.isLocked(filePath);
    if (existing && existing.agent !== agent) {
      throw new Error(
        `File '${filePath}' is already locked by ${existing.agent}` +
        (existing.reason ? ` (${existing.reason})` : '')
      );
    }

    const lock: FileLock = {
      file: filePath,
      agent,
      lockedAt: now(),
      reason
    };

    await ensureDir(this.locksDir);
    await writeJson(this.getLockPath(filePath), lock);

    await this.timeline.append({
      agent,
      event: 'file:locked',
      message: `Locked: ${filePath}${reason ? ` - ${reason}` : ''}`,
      data: { file: filePath, reason }
    });

    return lock;
  }

  /**
   * Unlock a file
   * @param agent - Agent unlocking (must be the locker)
   * @param filePath - File path to unlock
   * @param force - Force unlock even if not the locker
   * @returns True if unlocked, false if not found
   * @throws Error if locked by another agent and not forced
   * @example
   * await locker.unlock('ali', 'src/api/users.ts');
   * await locker.unlock('ali', 'src/api/users.ts', true); // force
   */
  async unlock(agent: string, filePath: string, force = false): Promise<boolean> {
    validateAgentName(agent);

    const existing = await this.isLocked(filePath);
    if (!existing) return false;

    if (existing.agent !== agent && !force) {
      throw new Error(
        `File '${filePath}' is locked by ${existing.agent}. Use --force to override.`
      );
    }

    await removeFile(this.getLockPath(filePath));

    await this.timeline.append({
      agent,
      event: 'file:unlocked',
      message: `Unlocked: ${filePath}${force ? ' (forced)' : ''}`,
      data: { file: filePath, forced: force }
    });

    return true;
  }

  /**
   * Check if file is locked
   * @param filePath - File path to check
   * @returns File lock or null if not locked
   * @example
   * const lock = await locker.isLocked('src/api/users.ts');
   */
  async isLocked(filePath: string): Promise<FileLock | null> {
    return readJson<FileLock>(this.getLockPath(filePath));
  }

  /**
   * List all active locks
   * @returns Array of file locks
   * @example
   * const locks = await locker.listLocks();
   */
  async listLocks(): Promise<FileLock[]> {
    const files = await listJsonFiles(this.locksDir);
    const results = await Promise.all(
      files.map(f => readJson<FileLock>(`${this.locksDir}/${f}`))
    );
    return results
      .filter((l): l is FileLock => l !== null)
      .sort((a, b) =>
        new Date(b.lockedAt).getTime() - new Date(a.lockedAt).getTime()
      );
  }

  /**
   * Get locks by agent
   * @param agent - Agent name
   * @returns Array of file locks
   * @example
   * const myLocks = await locker.agentLocks('ali');
   */
  async agentLocks(agent: string): Promise<FileLock[]> {
    validateAgentName(agent);
    const all = await this.listLocks();
    return all.filter(l => l.agent === agent);
  }

  /**
   * Check for lock conflict
   * @param agent - Agent wanting to edit
   * @param filePath - File path to check
   * @returns True if conflict exists
   * @example
   * if (await locker.hasConflict('zeynep', 'src/api/users.ts')) { ... }
   */
  async hasConflict(agent: string, filePath: string): Promise<boolean> {
    validateAgentName(agent);
    const lock = await this.isLocked(filePath);
    return lock !== null && lock.agent !== agent;
  }

  /**
   * Release all locks held by an agent
   * @param agent - Agent name
   * @returns Number of locks released
   * @example
   * const count = await locker.releaseAll('ali');
   */
  async releaseAll(agent: string): Promise<number> {
    validateAgentName(agent);
    const locks = await this.agentLocks(agent);

    for (const lock of locks) {
      await this.unlock(agent, lock.file);
    }

    return locks.length;
  }

  /**
   * Clean stale locks (locks held by offline/stale agents)
   * @param threshold - Seconds before considered stale
   * @param agents - List of agent profiles to check
   * @returns Number of locks cleaned
   * @example
   * const cleaned = await locker.cleanStale(300, allAgents);
   */
  async cleanStale(threshold: number, agents: AgentProfile[]): Promise<number> {
    const locks = await this.listLocks();
    let cleaned = 0;

    for (const lock of locks) {
      const agent = agents.find(a => a.name === lock.agent);
      const isAgentStale = !agent || isStale(agent.lastSeen, threshold);

      if (isAgentStale || agent?.status === 'offline') {
        await removeFile(this.getLockPath(lock.file));
        cleaned++;
      }
    }

    return cleaned;
  }
}
