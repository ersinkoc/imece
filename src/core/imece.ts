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

const IMECE_VERSION = '1.0.2';
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
      throw new Error('imece is already initialized. Use reset() to start over.');
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
      message: `imece initialized: ${config.project}`,
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
      /* c8 ignore next */
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
    const skillDest = `${this.projectRoot}/${targetDir ?? '.skills/imece'}/SKILL.md`;

    await ensureDir(skillDest.replace('/SKILL.md', ''));

    // Try multiple possible source locations
    const possibleSources = [
      // Running from source (dev)
      new URL('../../skill/SKILL.md', import.meta.url).pathname,
      // Running from dist/ after build
      new URL('../../../skill/SKILL.md', import.meta.url).pathname,
      // Relative to project root
      `${this.projectRoot}/skill/SKILL.md`,
      // Global install
      `${this.projectRoot}/node_modules/imece/skill/SKILL.md`
    ];

    let copied = false;
    for (const skillSource of possibleSources) {
      try {
        await copyFile(skillSource, skillDest);
        copied = true;
        break;
      } catch {
        // Try next source
      }
    }

    if (!copied) {
      // If copy fails, create a placeholder with essential info
      const placeholder = `# imece Skill

See https://github.com/ersinkoc/imece for documentation.
`;
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

    return `# imece Agent: ${name}

## Identity

**Name:** ${name}
**Role:** ${role}${isLead ? ' 👑 (Team Lead)' : ''}
**Model:** ${model}
**Capabilities:** ${caps}

## Session Start Checklist

At the start of every session:

1. **Check your inbox:** \`npx @oxog/imece inbox ${name}\`
2. **Check swarm status:** \`npx @oxog/imece status\`
3. **Send heartbeat:** \`npx @oxog/imece heartbeat ${name}\`

## Communication Commands

- Send message: \`npx @oxog/imece send ${name} <to> "Subject" --body "Message"\`
- Check inbox: \`npx @oxog/imece inbox ${name}\`
- Reply to message: \`npx @oxog/imece reply ${name} <msg-id> "Response"\`

## Task Commands

- Create task: \`npx @oxog/imece task create ${name} <to> "Title" --desc "Details"\`
- Claim task: \`npx @oxog/imece task claim <task-id> ${name}\`
- Complete task: \`npx @oxog/imece task complete <task-id> --note "Done"\`

## File Locking Protocol

Before editing ANY file:

1. **Check for locks:** \`npx @oxog/imece locks\`
2. **Lock your files:** \`npx @oxog/imece lock ${name} <filepath>\`
3. **Work on the file**
4. **Unlock when done:** \`npx @oxog/imece unlock ${name} <filepath>\`

## Self-Introduction

When joining a swarm, broadcast your presence:

\`npx @oxog/imece broadcast ${name} "${name} (${role}) is online and ready"\`

## Rules

1. Always check inbox before starting work
2. Lock files before editing
3. Update status when busy/idle
4. Respond to messages promptly
5. Mark tasks complete when done
6. Never leave without going offline

---

*This agent is part of an imece swarm - a coordinated group of AI assistants.*
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

  /**
   * Install AI tool commands to project
   * @param targetDir - Target directory (default: .)
   * @returns Path to installed commands directory
   */
  async installCommands(targetDir?: string): Promise<string> {
    const baseDir = targetDir ?? '.';
    const commandsDir = baseDir + '/.imece/commands';

    await ensureDir(commandsDir);

    // Create join script using string concatenation
    const joinScript = [
      '#!/bin/bash',
      '# imece-join: Universal join script for any AI assistant',
      '',
      'NAME="${1:-agent}"',
      'ROLE="${2:-developer}"',
      'MODEL="${3:-unknown}"',
      '',
      '# Auto-detect based on name',
      'if [[ "$NAME" == *"claude"* ]]; then',
      '  ROLE="${2:-architect}"',
      '  MODEL="claude-opus-4"',
      'elif [[ "$NAME" == *"cursor"* ]]; then',
      '  ROLE="${2:-developer}"',
      '  MODEL="cursor-default"',
      'elif [[ "$NAME" == *"copilot"* ]]; then',
      '  ROLE="${2:-reviewer}"',
      '  MODEL="github-copilot"',
      'elif [[ "$NAME" == *"windsurf"* ]]; then',
      '  ROLE="${2:-fullstack}"',
      '  MODEL="windsurf-default"',
      'elif [[ "$NAME" == *"tester"* ]] || [[ "$NAME" == *"test"* ]]; then',
      '  ROLE="tester"',
      'fi',
      '',
      'echo "Joining imece swarm as: $NAME ($ROLE)"',
      'imece join --name "$NAME" --role "$ROLE" --model "$MODEL"',
      '',
      'echo ""',
      'echo "Next steps:"',
      'echo "  imece inbox $NAME"',
      'echo "  imece status"'
    ].join('\n');

    // Create test script
    const testScript = [
      '#!/bin/bash',
      '# imece-test: Delegate testing to tester agent',
      '',
      'FILE="$1"',
      'DESC="$2"',
      '',
      'if [ -z "$FILE" ]; then',
      '  echo "Usage: imece-test <filepath> [description]"',
      '  echo "Example: imece-test src/api/users.ts"',
      '  exit 1',
      'fi',
      '',
      'if [ -n "$DESC" ]; then',
      '  imece test "$FILE" --desc "$DESC"',
      'else',
      '  imece test "$FILE"',
      'fi'
    ].join('\n');

    // Create inbox script
    const inboxScript = [
      '#!/bin/bash',
      '# imece-inbox: Check messages for agent',
      '',
      'AGENT="$1"',
      '',
      'if [ -z "$AGENT" ]; then',
      '  echo "Usage: imece-inbox <agent-name>"',
      '  exit 1',
      'fi',
      '',
      'imece inbox "$AGENT"'
    ].join('\n');

    const fs = await import('fs');

    await fs.promises.writeFile(commandsDir + '/imece-join.sh', joinScript, 'utf8');
    await fs.promises.writeFile(commandsDir + '/imece-test.sh', testScript, 'utf8');
    await fs.promises.writeFile(commandsDir + '/imece-inbox.sh', inboxScript, 'utf8');

    // Make scripts executable (best effort)
    try {
      await fs.promises.chmod(commandsDir + '/imece-join.sh', 0o755);
      await fs.promises.chmod(commandsDir + '/imece-test.sh', 0o755);
      await fs.promises.chmod(commandsDir + '/imece-inbox.sh', 0o755);
    } catch {
      // Ignore chmod errors (Windows, etc.)
    }

    return commandsDir;
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
