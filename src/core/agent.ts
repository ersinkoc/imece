/**
 * AgentManager - Agent lifecycle and profile management
 */

import { writeJson, readJson, listJsonFiles, removeFile, ensureDir } from '../utils/fs.js';
import { now, isStale } from '../utils/time.js';
import { validateAgentName, sanitizeAgentName } from '../utils/path.js';
import { validateStatus } from '../utils/validate.js';
import type { AgentProfile, AgentStatus, RegisterAgentOptions } from '../types.js';
import type { Timeline } from './timeline.js';

const DEFAULT_MODEL = 'unknown';
const DEFAULT_STALE_THRESHOLD = 300; // 5 minutes

export class AgentManager {
  private readonly agentsDir: string;
  private readonly timeline: Timeline;

  constructor(imeceDir: string, timeline: Timeline) {
    this.agentsDir = `${imeceDir}/agents`;
    this.timeline = timeline;
  }

  private getAgentPath(name: string): string {
    return `${this.agentsDir}/${name}.json`;
  }

  /**
   * Register a new agent
   * @param options - Registration options
   * @returns Created agent profile
   * @throws Error if name is invalid or agent already exists
   * @example
   * const agent = await agents.register({
   *   name: 'ali',
   *   role: 'lead-architect',
   *   capabilities: ['architecture', 'api-design'],
   *   model: 'claude-opus-4-6',
   *   isLead: true
   * });
   */
  async register(options: RegisterAgentOptions): Promise<AgentProfile> {
    const name = sanitizeAgentName(options.name);
    validateAgentName(name);

    if (await this.exists(name)) {
      throw new Error(`Agent '${name}' already exists`);
    }

    const timestamp = now();
    const agent: AgentProfile = {
      name,
      role: options.role,
      capabilities: options.capabilities ?? [],
      status: 'online',
      currentTask: null,
      model: options.model ?? DEFAULT_MODEL,
      registeredAt: timestamp,
      lastSeen: timestamp,
      filesWorkingOn: [],
      isLead: options.isLead ?? false,
      meta: {}
    };

    await ensureDir(this.agentsDir);
    await writeJson(this.getAgentPath(name), agent);

    await this.timeline.append({
      agent: name,
      event: 'agent:join',
      message: `Agent ${name} joined as ${options.role}`,
      data: { role: options.role, isLead: agent.isLead }
    });

    return agent;
  }

  /**
   * Get agent profile
   * @param name - Agent name
   * @returns Agent profile or null if not found
   * @example
   * const agent = await agents.get('ali');
   * if (agent) console.log(agent.status);
   */
  async get(name: string): Promise<AgentProfile | null> {
    return readJson<AgentProfile>(this.getAgentPath(name));
  }

  /**
   * List all agents
   * @returns Array of all agent profiles
   * @example
   * const allAgents = await agents.list();
   */
  async list(): Promise<AgentProfile[]> {
    const files = await listJsonFiles(this.agentsDir);
    const results = await Promise.all(
      files.map(f => readJson<AgentProfile>(`${this.agentsDir}/${f}`))
    );
    return results
      .filter((a): a is AgentProfile => a !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * List active agents (not stale)
   * @param staleThreshold - Seconds before considered stale (default: 300)
   * @returns Array of active agent profiles
   * @example
   * const active = await agents.listActive(600); // 10 min threshold
   */
  async listActive(staleThreshold = DEFAULT_STALE_THRESHOLD): Promise<AgentProfile[]> {
    const agents = await this.list();
    return agents.filter(a => !isStale(a.lastSeen, staleThreshold) && a.status !== 'offline');
  }

  /**
   * Update agent status
   * @param name - Agent name
   * @param status - New status
   * @param currentTask - Optional current task ID
   * @returns Updated profile or null if not found
   * @example
   * await agents.updateStatus('ali', 'busy', 'task_kx7f2');
   */
  async updateStatus(
    name: string,
    status: AgentStatus,
    currentTask?: string | null
  ): Promise<AgentProfile | null> {
    validateStatus(status);

    const agent = await this.get(name);
    if (!agent) return null;

    const oldStatus = agent.status;
    agent.status = status;
    agent.lastSeen = now();
    if (currentTask !== undefined) {
      agent.currentTask = currentTask;
    }

    await writeJson(this.getAgentPath(name), agent);

    if (oldStatus !== status) {
      await this.timeline.append({
        agent: name,
        event: 'agent:status',
        message: `Status changed from ${oldStatus} to ${status}`,
        data: { oldStatus, newStatus: status }
      });
    }

    return agent;
  }

  /**
   * Update agent heartbeat (lastSeen timestamp)
   * @param name - Agent name
   * @returns Updated profile or null if not found
   * @example
   * await agents.heartbeat('ali');
   */
  async heartbeat(name: string): Promise<AgentProfile | null> {
    const agent = await this.get(name);
    if (!agent) return null;

    agent.lastSeen = now();
    await writeJson(this.getAgentPath(name), agent);
    return agent;
  }

  /**
   * Set files agent is working on
   * @param name - Agent name
   * @param files - Array of file paths
   * @returns Updated profile or null if not found
   * @example
   * await agents.setWorkingFiles('ali', ['src/api/users.ts']);
   */
  async setWorkingFiles(name: string, files: string[]): Promise<AgentProfile | null> {
    const agent = await this.get(name);
    if (!agent) return null;

    agent.filesWorkingOn = files;
    agent.lastSeen = now();
    await writeJson(this.getAgentPath(name), agent);
    return agent;
  }

  /**
   * Mark agent as offline
   * @param name - Agent name
   * @returns Updated profile or null if not found
   * @example
   * await agents.goOffline('ali');
   */
  async goOffline(name: string): Promise<AgentProfile | null> {
    const agent = await this.updateStatus(name, 'offline', null);
    if (agent) {
      agent.filesWorkingOn = [];
      await writeJson(this.getAgentPath(name), agent);

      await this.timeline.append({
        agent: name,
        event: 'agent:leave',
        message: `Agent ${name} went offline`,
        data: {}
      });
    }
    return agent;
  }

  /**
   * Remove agent
   * @param name - Agent name
   * @returns True if removed, false if not found
   * @example
   * const removed = await agents.remove('ali');
   */
  async remove(name: string): Promise<boolean> {
    const agent = await this.get(name);
    if (!agent) return false;

    await removeFile(this.getAgentPath(name));

    await this.timeline.append({
      agent: name,
      event: 'agent:leave',
      message: `Agent ${name} removed`,
      data: {}
    });

    return true;
  }

  /**
   * Check if agent exists
   * @param name - Agent name
   * @returns True if agent exists
   * @example
   * if (await agents.exists('ali')) { ... }
   */
  async exists(name: string): Promise<boolean> {
    return (await this.get(name)) !== null;
  }

  /**
   * Get team lead
   * @returns Lead agent or null
   * @example
   * const lead = await agents.getLead();
   */
  async getLead(): Promise<AgentProfile | null> {
    const all = await this.list();
    return all.find(a => a.isLead) ?? null;
  }

  /**
   * Set agent as team lead
   * @param name - Agent name
   * @returns Updated profile or null if not found
   * @example
   * await agents.setLead('ali');
   */
  async setLead(name: string): Promise<AgentProfile | null> {
    // Remove lead from current lead
    const currentLead = await this.getLead();
    if (currentLead && currentLead.name !== name) {
      currentLead.isLead = false;
      await writeJson(this.getAgentPath(currentLead.name), currentLead);
    }

    // Set new lead
    const agent = await this.get(name);
    if (!agent) return null;

    agent.isLead = true;
    agent.lastSeen = now();
    await writeJson(this.getAgentPath(name), agent);

    return agent;
  }

  /**
   * Update agent metadata
   * @param name - Agent name
   * @param meta - Metadata to merge
   * @returns Updated profile or null if not found
   * @example
   * await agents.updateMeta('ali', { preferredEditor: 'vim' });
   */
  async updateMeta(
    name: string,
    meta: Record<string, unknown>
  ): Promise<AgentProfile | null> {
    const agent = await this.get(name);
    if (!agent) return null;

    agent.meta = { ...agent.meta, ...meta };
    agent.lastSeen = now();
    await writeJson(this.getAgentPath(name), agent);
    return agent;
  }
}
