# imece — Universal Multi-Agent Coordination for AI Code Assistants

> *"imece" — an Anatolian tradition where an entire village comes together to accomplish a task no single person could do alone. Same energy, but with AI agents.*

## Package Identity

| Field | Value |
|-------|-------|
| **NPM Package** | `imece` |
| **GitHub Repository** | `https://github.com/ersinkoc/imece` |
| **License** | MIT |
| **Author** | Ersin Koç (ersinkoc) |

> **One-line:** File-based IPC system that lets multiple AI code assistants coordinate, communicate, and delegate tasks on the same codebase — works with any AI tool, any terminal, any OS.

Claude Code has a built-in "Agent Teams" feature (TeammateTool, TaskCreate, SendMessage) but it is Claude Code-only and experimental. This project takes the same concepts — shared task list, inbox-based messaging, team lead pattern, teammate lifecycle — and implements them as a universal, file-based protocol that works with Claude Code, Cursor, Windsurf, Copilot, Cline, Aider, or any AI assistant that can read/write files.

## Architecture

```
any-project/
├── .imece/
│   ├── imece.json                       # Swarm metadata + config
│   ├── agents/                          # One JSON per agent
│   │   ├── ali.json
│   │   └── zeynep.json
│   ├── inbox/                           # Per-agent message queues
│   │   ├── ali/
│   │   │   ├── msg_kx7f2_from_zeynep.json
│   │   │   └── .processed/
│   │   └── zeynep/
│   ├── tasks/                           # Kanban: backlog/ active/ done/
│   │   ├── backlog/
│   │   ├── active/
│   │   └── done/
│   ├── timeline.jsonl                   # Append-only event log
│   └── locks/                           # File-level edit locks
│       └── src__api__users.ts.lock.json
├── .skills/imece/SKILL.md               # Teaches any AI the imece protocol
└── AGENTS.md
```

Design inspired by Claude Code Agent Teams: Inbox pattern (SendMessage), Shared task list (TaskCreate/TaskUpdate), Timeline (broadcast), Team lead pattern, Lifecycle events, File conflict prevention via locks.

## NON-NEGOTIABLE RULES

### 1. ZERO RUNTIME DEPENDENCIES
```json
{ "dependencies": {} }
```
Use only Node.js built-in APIs. No chalk, no glob, no commander.

### 2. devDependencies
typescript ^5.8.0, vitest ^3.0.0, @vitest/coverage-v8 ^3.0.0, tsup ^8.0.0, @types/node ^22.0.0

### 3. Create SPECIFICATION.md, IMPLEMENTATION.md, TASKS.md FIRST before any code.

### 4. TypeScript Strict: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns, target ES2024, module NodeNext, moduleResolution NodeNext

### 5. ESM Only: "type": "module", all imports use .js extension

### 6. 100% Test Coverage: tests/ directory, vitest, every branch and error path

### 7. LLM-Native: llms.txt, predictable API naming, JSDoc with @example on every public API

## Project Structure

```
imece/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── llms.txt
├── README.md
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── src/
│   ├── index.ts                         # Public API exports
│   ├── types.ts                         # All TypeScript interfaces/types
│   ├── core/
│   │   ├── imece.ts                     # ImeceManager — init, config, status
│   │   ├── agent.ts                     # AgentManager — register, status, heartbeat, lifecycle
│   │   ├── messenger.ts                 # Messenger — send, inbox, mark-read, reply
│   │   ├── taskboard.ts                 # TaskBoard — create, claim, complete, delegate, block/unblock
│   │   ├── timeline.ts                  # Timeline — append events, query history, search
│   │   └── locker.ts                    # FileLocker — lock, unlock, check, list active locks
│   ├── cli/
│   │   ├── index.ts                     # CLI entry point + arg parser
│   │   ├── commands/
│   │   │   ├── init.ts                  # imece init
│   │   │   ├── agent.ts                 # imece register, imece status, imece whoami
│   │   │   ├── message.ts              # imece send, imece inbox, imece reply
│   │   │   ├── task.ts                  # imece task create/claim/complete/delegate/list
│   │   │   ├── broadcast.ts             # imece broadcast, imece timeline
│   │   │   ├── lock.ts                  # imece lock, imece unlock, imece locks
│   │   │   ├── prompt.ts               # imece prompt <agent> — generate agent system prompt
│   │   │   └── install.ts              # imece install-skill — copy SKILL.md to project
│   │   └── ui.ts                        # ANSI colors, box drawing, tables (zero-dep)
│   └── utils/
│       ├── fs.ts                        # Safe file ops: readJson, writeJson, appendJsonl, readJsonl, moveFile, ensureDir
│       ├── id.ts                        # ID generation: timestamp-based short IDs (base36)
│       ├── time.ts                      # Timestamp helpers: now(), relative(), isStale()
│       ├── path.ts                      # Path encoding/decoding for lock files, sanitization
│       └── validate.ts                  # Input validation: agent names, priorities, etc.
├── tests/
│   ├── helpers/
│   │   └── setup.ts                     # Test helpers: createTempImece(), cleanup()
│   ├── core/
│   │   ├── imece.test.ts
│   │   ├── agent.test.ts
│   │   ├── messenger.test.ts
│   │   ├── taskboard.test.ts
│   │   ├── timeline.test.ts
│   │   └── locker.test.ts
│   ├── cli/
│   │   └── commands.test.ts
│   └── utils/
│       ├── fs.test.ts
│       ├── id.test.ts
│       ├── time.test.ts
│       ├── path.test.ts
│       └── validate.test.ts
├── templates/
│   └── agent-prompt.hbs                 # Agent system prompt template
├── skill/
│   └── SKILL.md                         # AI assistant skill file
└── examples/
    ├── 01-basic-setup.md
    ├── 02-lead-and-specialists.md
    ├── 03-code-review-pipeline.md
    ├── 04-tdd-pair.md
    ├── 05-full-stack-team.md
    └── 06-debugging-swarm.md
```

## Types (src/types.ts)

Every type explicit. No `any`.

```typescript
// ═══════════════════════════════════════
// AGENT
// ═══════════════════════════════════════

export interface AgentProfile {
  name: string;                     // lowercase, alphanumeric + hyphens, max 20
  role: string;
  capabilities: string[];
  status: AgentStatus;
  currentTask: string | null;
  model: string;                    // AI model name or "human"
  registeredAt: string;             // ISO 8601 UTC
  lastSeen: string;                 // ISO 8601 UTC — updated on every action
  filesWorkingOn: string[];
  isLead: boolean;
  meta: Record<string, unknown>;
}

export type AgentStatus = 'online' | 'busy' | 'idle' | 'waiting' | 'offline';

// ═══════════════════════════════════════
// MESSAGE
// ═══════════════════════════════════════

export interface ImeceMessage {
  id: string;                       // base36 timestamp + random
  from: string;
  to: string;
  timestamp: string;
  type: MessageType;
  subject: string;
  body: string;
  priority: Priority;
  expectsReply: boolean;
  replyTo: string | null;
  read: boolean;
}

export type MessageType =
  | 'message'
  | 'task-delegate'
  | 'question'
  | 'status-update'
  | 'review-request'
  | 'approval'
  | 'rejection'
  | 'blocker'
  | 'handoff';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// ═══════════════════════════════════════
// TASK (inspired by Agent Teams TaskCreate/TaskUpdate)
// ═══════════════════════════════════════

export interface ImeceTask {
  id: string;
  createdBy: string;
  assignedTo: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: Priority;
  status: TaskStatus;
  blockedBy: string[];              // task IDs that must complete first
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: TaskNote[];
  tags: string[];
}

export type TaskStatus = 'pending' | 'active' | 'done' | 'blocked';

export interface TaskNote {
  agent: string;
  timestamp: string;
  text: string;
}

// ═══════════════════════════════════════
// TIMELINE (broadcast + event history)
// ═══════════════════════════════════════

export interface TimelineEvent {
  timestamp: string;
  agent: string;
  event: TimelineEventType;
  message: string;
  data?: Record<string, unknown>;
}

export type TimelineEventType =
  | 'agent:join' | 'agent:leave' | 'agent:status'
  | 'message:sent' | 'message:read'
  | 'task:created' | 'task:claimed' | 'task:completed' | 'task:blocked' | 'task:unblocked'
  | 'file:locked' | 'file:unlocked'
  | 'broadcast' | 'error';

// ═══════════════════════════════════════
// FILE LOCK
// ═══════════════════════════════════════

export interface FileLock {
  file: string;
  agent: string;
  lockedAt: string;
  reason?: string;
}

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

export interface ImeceConfig {
  project: string;
  created: string;
  version: string;
  description?: string;
  settings: ImeceSettings;
}

export interface ImeceSettings {
  staleThresholdSeconds: number;    // default 300 (5 min)
  maxAgents: number;                // default 10
  cleanupAfterHours: number;        // default 24
}

// ═══════════════════════════════════════
// STATUS (aggregate)
// ═══════════════════════════════════════

export interface ImeceStatus {
  config: ImeceConfig;
  agents: AgentProfile[];
  taskSummary: { backlog: number; active: number; done: number; blocked: number };
  activeTasks: ImeceTask[];
  recentTimeline: TimelineEvent[];
  activeLocks: FileLock[];
}
```

## Core Modules

### src/core/imece.ts — ImeceManager

Constructor(projectRoot? defaults cwd). Has sub-managers: agents, messages, tasks, timeline, locks.

Methods: init(description?), isInitialized(), getConfig(), getStatus({timelineLimit?}), setupGitignore(), installSkill(targetDir?), generatePrompt(name,role,caps?), reset().

The `.imece/` directory name and `imece.json` config file name. NOT `.swarm/`.

### src/core/agent.ts — AgentManager

Constructor(imeceDir, timeline).

Methods: register({name,role,capabilities?,model?,isLead?}), get(name), list(), listActive(staleThreshold?), updateStatus(name,status,currentTask?), heartbeat(name), setWorkingFiles(name,files), goOffline(name), remove(name), exists(name), getLead(), setLead(name), updateMeta(name,meta).

### src/core/messenger.ts — Messenger

Constructor(imeceDir, timeline). Inspired by Agent Teams SendMessage.

Methods: send({from,to,type?,subject,body,priority?,expectsReply?,replyTo?}), getInbox(agent), unreadCount(agent), getMessage(agent,msgId), markAsRead(agent,msgId), markAllAsRead(agent), reply(agent,msgId,body), getProcessed(agent), getThread(agent1,agent2).

### src/core/taskboard.ts — TaskBoard

Constructor(imeceDir, timeline). Inspired by Agent Teams TaskCreate/TaskUpdate/TaskList. Key addition: blockedBy for task dependencies.

Methods: create({createdBy,assignedTo,title,description,acceptanceCriteria?,priority?,blockedBy?,tags?}), claim(taskId,agent), complete(taskId,note?), block(taskId,reason), unblock(taskId), addNote(taskId,agent,text), listByStatus(status), all(), find(taskId), delegate(task,messenger), getAgentTasks(agent), isUnblocked(taskId).

### src/core/timeline.ts — Timeline

Constructor(imeceDir). The imece's memory. Single append-only JSONL file.

Methods: append(event), recent(limit?), all(), byType(eventType), byAgent(agent), search(query), range(from,to), broadcast(agent,message,data?).

### src/core/locker.ts — FileLocker

Constructor(imeceDir, timeline). Advisory file locking.

Methods: lock(agent,file,reason?), unlock(agent,file,force?), isLocked(file), listLocks(), agentLocks(agent), hasConflict(agent,file), releaseAll(agent), cleanStale(threshold,agents).

## CLI Commands

```
Usage: imece <command> [subcommand] [options]

Core:
  imece init [--desc <text>]
  imece status
  imece reset

Agents:
  imece register <n> <role> [--caps <c1,c2>] [--model <model>] [--lead]
  imece whoami <n>
  imece agents
  imece heartbeat <n>
  imece offline <n>

Messages:
  imece send <from> <to> <subject> [--body <text>] [--type <type>] [--priority <p>]
  imece inbox <agent> [--all]
  imece read <agent> <msg-id>
  imece reply <agent> <msg-id> <body>
  imece thread <agent1> <agent2>

Tasks:
  imece task create <from> <to> <title> [--desc <text>] [--criteria <c1,c2>] [--priority <p>] [--tags <t1,t2>]
  imece task list [--status <s>] [--agent <n>]
  imece task show <task-id>
  imece task claim <task-id> <agent>
  imece task complete <task-id> [--note <text>]
  imece task delegate <from> <to> <title> [--desc <text>] [--criteria <c1,c2>]
  imece task block <task-id> <reason>
  imece task unblock <task-id>
  imece task note <task-id> <agent> <text>

Timeline:
  imece broadcast <agent> <message>
  imece timeline [--limit <n>] [--agent <n>] [--type <event-type>]
  imece search <query>

Locks:
  imece lock <agent> <filepath>
  imece unlock <agent> <filepath>
  imece locks

Skill:
  imece install-skill [--dir <path>]
  imece prompt <n> <role> [--caps <c1,c2>] [--model <model>]
```

Arg parser: ParsedArgs { command, subcommand?, args[], flags Record<string,string|boolean> }. Support --key value and --key=value.

### CLI Output (src/cli/ui.ts)

ANSI codes (no chalk): reset, bold, dim, red, green, yellow, blue, magenta, cyan, gray. Unicode icons: 🟢 online, 🟡 busy, 🔵 idle, ⏳ waiting, 🔴 offline, 📬/📭 inbox, 📋 task, ✅ done, 🔄 active, 🚫 blocked, 📢 broadcast, 🚨 urgent, 🔒/🔓 lock, 👑 lead.

Box drawing functions: box(title,content), table(headers,rows), divider(), badge(text,color).

`imece status` produces:

```
╭─────────────────────────────────────────────────╮
│             🤝 İMECE STATUS                     │
│             Project: my-app                     │
╰─────────────────────────────────────────────────╯

👥 AGENTS (2 online, 1 offline)
┌──────────┬────────────────┬──────────┬───────────────────┬──────┐
│ Name     │ Role           │ Status   │ Current Task      │ 📬  │
├──────────┼────────────────┼──────────┼───────────────────┼──────┤
│ 👑 ali   │ lead-architect │ 🟡 busy  │ Reviewing PR #12  │  0  │
│ zeynep   │ test-engineer  │ 🟢 idle  │                   │  2  │
│ mehmet   │ frontend-dev   │ 🔴 offline│                  │  0  │
└──────────┴────────────────┴──────────┴───────────────────┴──────┘

📋 TASKS
  Backlog: 3  │  Active: 2  │  Done: 5  │  Blocked: 1

  🔄 Active:
    #kx7f2 → ali: "Review authentication module"
    #m9p3q → zeynep: "Write unit tests for user API"

  🚫 Blocked:
    #r4t8w → mehmet: "Build dashboard UI" (blocked by #kx7f2)

🔒 LOCKS (2 active)
  src/api/users.ts → ali (2 min ago)
  src/api/auth.ts → ali (5 min ago)

📢 RECENT TIMELINE
  [ali] 🔄 Claimed task: Review authentication module (2 min ago)
  [zeynep] 📢 Test infrastructure ready (8 min ago)
  [ali] 🔒 Locked: src/api/users.ts (10 min ago)
```

## Utilities

### src/utils/fs.ts
- readJson<T>(filePath): Promise<T | null> — null on any error
- writeJson(filePath, data): Promise<void> — ATOMIC: write to .tmp.<random> then rename()
- appendJsonl(filePath, data): Promise<void>
- readJsonl<T>(filePath, limit?): Promise<T[]> — optionally last N lines
- listJsonFiles(dirPath): Promise<string[]> — non-recursive, excludes subdirs
- moveFile(from, to): Promise<void> — creates target dir if needed
- ensureDir(dirPath): Promise<void>
- exists(path): Promise<boolean>

### src/utils/id.ts
- generateId(): string — base36 timestamp + 4 random chars. e.g. "kx7f2a3b"
- messageFilename(id, from): string — msg_{id}_from_{agent}.json
- taskFilename(id, title): string — task_{id}_{slug}.json
- extractId(filename): string | null

### src/utils/time.ts
- now(): string — UTC ISO 8601
- relative(isoTimestamp): string — "2 min ago", "1 hour ago"
- isStale(isoTimestamp, thresholdSeconds): boolean

### src/utils/path.ts
- encodePath(filePath): string — / → __
- decodePath(encoded): string
- sanitizeAgentName(name): string — lowercase, alphanumeric+hyphens, max 20
- validateAgentName(name): void — throws if invalid

### src/utils/validate.ts
- validatePriority, validateMessageType, validateStatus, validateTaskStatus

## SKILL.md (skill/SKILL.md)

Installed to .skills/imece/SKILL.md via `imece install-skill`. Teaches ANY AI assistant the imece protocol.

```yaml
---
name: imece
description: |
  Universal multi-agent coordination protocol for AI code assistants. Enables this AI instance
  to participate in an imece — a coordinated group of agents working on the same codebase.
  Use this skill ALWAYS when: you see a .imece/ directory in the project, another agent sends
  you a message, you need to coordinate with other AI agents, the user mentions "imece",
  "agents", "multi-terminal", "team", or asks you to work with other AI instances. ALWAYS
  check for .imece/ at the start of every conversation. Works with ANY AI code assistant.
---
```

Content must include: session start checklist, CLI reference table, 10 behavioral rules, workflow pattern, delegation pattern, conflict prevention. Emphasize universal compatibility.

## Agent Prompt Template (templates/agent-prompt.hbs)

Placeholders: {{name}}, {{role}}, {{capabilities}}, {{model}}, {{isLead}}. Simple string.replace — no Handlebars dependency.

Generated by `imece prompt ali lead-architect --caps "architecture,api"`. Contains: identity block, session start commands (npx imece inbox, npx imece status), communication reference, file locking protocol, self-introduction broadcast.

## package.json

```json
{
  "name": "imece",
  "version": "1.0.0",
  "description": "Universal multi-agent coordination for AI code assistants — like imece, the Anatolian tradition of working together",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "imece": "./dist/bin.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test:coverage"
  },
  "files": ["dist", "templates", "skill", "llms.txt"],
  "keywords": [
    "multi-agent", "imece", "coordination", "claude-code",
    "ai-assistant", "ipc", "cursor", "windsurf", "copilot",
    "cline", "aider", "task-delegation", "agent-teams", "swarm"
  ],
  "author": "Ersin Koç",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ersinkoc/imece.git"
  },
  "homepage": "https://github.com/ersinkoc/imece",
  "engines": { "node": ">=22" },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^22.0.0"
  }
}
```

## Implementation Order

Phase 0: SPECIFICATION.md, IMPLEMENTATION.md, TASKS.md
Phase 1: package.json, tsconfig, tsup, vitest configs, src/types.ts, all utils + tests, test helpers
Phase 2: timeline, imece, agent, messenger, taskboard, locker + tests for each
Phase 3: src/index.ts exports
Phase 4: cli/ui.ts, cli/index.ts, all command files, src/bin.ts (with shebang), CLI tests
Phase 5: skill/SKILL.md, templates/agent-prompt.hbs
Phase 6: llms.txt, README.md, examples
Phase 7: Full coverage run, build, e2e verification

## Critical Reminders

- ZERO dependencies. "dependencies": {} MUST stay empty.
- ESM only. All imports use .js extension.
- No any. Use unknown + type guards.
- Atomic writes. writeJson uses temp+rename.
- Concurrent safe. Multiple agents read/write simultaneously.
- Agent names: lowercase, alphanumeric+hyphens, max 20 chars.
- Lock filenames encode / as __ for filesystem safety.
- src/bin.ts needs #!/usr/bin/env node shebang.
- CLI shows helpful colored errors, not stack traces.
- No process.exit in library code.
- Timeline is truth — every mutation emits an event.
- File structure is state — task status = which directory it is in.
- npx friendly — works without global install.
- Skill file is universal — works with ANY AI code assistant.
- Directory is `.imece/` NOT `.swarm/`
- Config file is `imece.json` NOT `swarm.json`
- CLI command is `imece` NOT `swarm`
- Class name is `ImeceManager` NOT `SwarmManager`
- Type prefix is `Imece` (ImeceMessage, ImeceTask, ImeceConfig, ImeceStatus)

## BEGIN

Create SPECIFICATION.md → IMPLEMENTATION.md → TASKS.md → then code following TASKS.md. Test as you go. This will be published to npm as `imece`.
