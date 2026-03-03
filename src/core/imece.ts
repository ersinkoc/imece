/**
 * ImeceManager - Main entry point and coordinator
 * Manages the .imece/ directory and provides access to all sub-managers
 */

import { writeJson, readJson, ensureDir, exists, copyFile } from '../utils/fs.js';
import { now } from '../utils/time.js';
import { AgentManager } from './agent.js';
import { Messenger } from './messenger.js';
import { TaskBoard } from './taskboard.js';
import { Timeline } from './timeline.js';
import { FileLocker } from './locker.js';
import type { ImeceConfig, ImeceStatus, StatusOptions, ImeceSettings } from '../types.js';

const IMECE_VERSION = '1.0.0';
const DEFAULT_SETTINGS: ImeceSettings = {
  staleThresholdSeconds: 300,
  maxAgents: 10,
  cleanupAfterHours: 24
};

export class ImeceManager {
  readonly projectRoot: string;
  readonly imeceDir: string;

  readonly agents: AgentManager;
  readonly messages: Messenger;
  readonly tasks: TaskBoard;
  readonly timeline: Timeline;
  readonly locks: FileLocker;

  /**
   * Create a new ImeceManager
   * @param projectRoot - Project root directory (default: process.cwd())
   * @example
   * const imece = new ImeceManager('/path/to/project');
   * const imece = new ImeceManager(); // uses cwd
   */
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? process.cwd();
    this.imeceDir = `${this.projectRoot}/.imece`;

    // Create timeline first (other managers depend on it)
    this.timeline = new Timeline(this.imeceDir);

    // Create sub-managers
    this.agents = new AgentManager(this.imeceDir, this.timeline);
    this.messages = new Messenger(this.imeceDir, this.timeline);
    this.tasks = new TaskBoard(this.imeceDir, this.timeline);
    this.locks = new FileLocker(this.imeceDir, this.timeline);
  }

  private get configPath(): string {
    return `${this.imeceDir}/imece.json`;
  }

  /**
   * Initialize imece workspace
   * @param description - Optional project description
   * @throws Error if already initialized
   * @example
   * await imece.init('Multi-agent coordination for my-app');
   */
  async init(description?: string): Promise<void> {
    if (await this.isInitialized()) {
      throw new Error('İmece is already initialized. Use reset() to start over.');
    }

    // Create directory structure
    await ensureDir(`${this.imeceDir}/agents`);
    await ensureDir(`${this.imeceDir}/inbox`);
    await ensureDir(`${this.imeceDir}/tasks/pending`);
    await ensureDir(`${this.imeceDir}/tasks/active`);
    await ensureDir(`${this.imeceDir}/tasks/done`);
    await ensureDir(`${this.imeceDir}/tasks/blocked`);
    await ensureDir(`${this.imeceDir}/locks`);

    // Create config
    const config: ImeceConfig = {
      project: this.getProjectName(),
      created: now(),
      version: IMECE_VERSION,
      settings: DEFAULT_SETTINGS
    };
    if (description) {
      config.description = description;
    }

    await writeJson(this.configPath, config);

    // Add to .gitignore
    await this.setupGitignore();

    // Initial timeline event
    await this.timeline.append({
      agent: 'system',
      event: 'broadcast',
      message: `İmece initialized: ${config.project}`,
      data: { description }
    });
  }

  /**
   * Check if imece is initialized
   * @returns True if .imece directory exists with valid config
   * @example
   * if (await imece.isInitialized()) { ... }
   */
  async isInitialized(): Promise<boolean> {
    return exists(this.configPath);
  }

  /**
   * Get configuration
   * @returns Config or null if not initialized
   * @example
   * const config = await imece.getConfig();
   */
  async getConfig(): Promise<ImeceConfig | null> {
    return readJson<ImeceConfig>(this.configPath);
  }

  /**
   * Get full status of imece
   * @param options - Options for status query
   * @returns Status object or null if not initialized
   * @example
   * const status = await imece.getStatus({ timelineLimit: 10 });
   */
  async getStatus(options?: StatusOptions): Promise<ImeceStatus | null> {
    const config = await this.getConfig();
    if (!config) return null;

    const [agents, allTasks, recentTimeline, activeLocks] = await Promise.all([
      this.agents.list(),
      this.tasks.all(),
      this.timeline.recent(options?.timelineLimit ?? 10),
      this.locks.listLocks()
    ]);

    const taskSummary = {
      backlog: allTasks.filter(t => t.status === 'pending').length,
      active: allTasks.filter(t => t.status === 'active').length,
      done: allTasks.filter(t => t.status === 'done').length,
      blocked: allTasks.filter(t => t.status === 'blocked').length
    };

    const activeTasks = allTasks.filter(t => t.status === 'active');

    return {
      config,
      agents,
      taskSummary,
      activeTasks,
      recentTimeline,
      activeLocks
    };
  }

  /**
   * Add .imece/ to .gitignore
   * @example
   * await imece.setupGitignore();
   */
  async setupGitignore(): Promise<void> {
    const gitignorePath = `${this.projectRoot}/.gitignore`;
    const entry = '.imece/';

    try {
      const fs = await import('fs');
      let content = '';

      try {
        content = await fs.promises.readFile(gitignorePath, 'utf8');
      } catch {
        // File doesn't exist
      }

      if (!content.includes(entry)) {
        const newContent = content.length > 0 && !content.endsWith('\n')
          ? `${content}\n${entry}\n`
          : `${content}${entry}\n`;
        await fs.promises.writeFile(gitignorePath, newContent, 'utf8');
      }
    } catch {
      // Ignore errors (e.g., no write permission)
    }
  }

  /**
   * Install skill file to project
   * @param targetDir - Target directory (default: .skills/imece/)
   * @returns Path to installed skill file
   * @example
   * await imece.installSkill('./docs/skills');
   */
  async installSkill(targetDir?: string): Promise<string> {
    const skillSource = new URL('../../skill/SKILL.md', import.meta.url).pathname;
    const skillDest = `${this.projectRoot}/${targetDir ?? '.skills/imece'}/SKILL.md`;

    await ensureDir(skillDest.replace('/SKILL.md', ''));

    try {
      await copyFile(skillSource, skillDest);
    } catch {
      // If copy fails, create a placeholder
      const placeholder = `# İmece Skill\n\nSee https://github.com/ersinkoc/imece for documentation.\n`;
      const fs = await import('fs');
      await fs.promises.writeFile(skillDest, placeholder, 'utf8');
    }

    return skillDest;
  }

  /**
   * Generate agent system prompt
   * @param name - Agent name
   * @param role - Agent role
   * @param options - Additional options
   * @returns Generated prompt text
   * @example
   * const prompt = imece.generatePrompt('ali', 'lead-architect', {
   *   capabilities: ['architecture', 'api-design'],
   *   model: 'claude-opus-4-6'
   * });
   */
  generatePrompt(
    name: string,
    role: string,
    options?: {
      capabilities?: string[];
      model?: string;
      isLead?: boolean;
    }
  ): string {
    const caps = options?.capabilities?.join(', ') ?? 'general development';
    const model = options?.model ?? 'unknown';
    const isLead = options?.isLead ?? false;

    return `# İmece Agent: ${name}

## Identity

**Name:** ${name}
**Role:** ${role}${isLead ? ' 👑 (Team Lead)' : ''}
**Model:** ${model}
**Capabilities:** ${caps}

## Session Start Checklist

At the start of every session:

1. **Check your inbox:** \`npx imece inbox ${name}\`
2. **Check swarm status:** \`npx imece status\`
3. **Send heartbeat:** \`npx imece heartbeat ${name}\`

## Communication Commands

- Send message: \`npx imece send ${name} <to> "Subject" --body "Message"\`
- Check inbox: \`npx imece inbox ${name}\`
- Reply to message: \`npx imece reply ${name} <msg-id> "Response"\`

## Task Commands

- Create task: \`npx imece task create ${name} <to> "Title" --desc "Details"\`
- Claim task: \`npx imece task claim <task-id> ${name}\`
- Complete task: \`npx imece task complete <task-id> --note "Done"\`

## File Locking Protocol

Before editing ANY file:

1. **Check for locks:** \`npx imece locks\`
2. **Lock your files:** \`npx imece lock ${name} <filepath>\`
3. **Work on the file**
4. **Unlock when done:** \`npx imece unlock ${name} <filepath>\`

## Self-Introduction

When joining a swarm, broadcast your presence:

\`npx imece broadcast ${name} "${name} (${role}) is online and ready"\`

## Rules

1. Always check inbox before starting work
2. Lock files before editing
3. Update status when busy/idle
4. Respond to messages promptly
5. Mark tasks complete when done
6. Never leave without going offline

---

*This agent is part of an İmece swarm - a coordinated group of AI assistants.*
`;
  }

  /**
   * Reset imece workspace (DESTRUCTIVE)
   * Removes all data and reinitializes
   * @example
   * await imece.reset();
   */
  async reset(): Promise<void> {
    const fs = await import('fs');
    await fs.promises.rm(this.imeceDir, { recursive: true, force: true });
  }

  private getProjectName(): string {
    try {
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync(`${this.projectRoot}/package.json`, 'utf8'));
      return pkg.name ?? 'unknown';
    } catch {
      return this.projectRoot.split('/').pop()?.split('\\').pop() ?? 'unknown';
    }
  }
}
