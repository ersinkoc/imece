# İmece Specification

## Overview

**İmece** is a file-based IPC (Inter-Process Communication) system that enables multiple AI code assistants to coordinate, communicate, and delegate tasks on the same codebase. It works with any AI tool, any terminal, and any OS.

## Core Philosophy

- **Universal Compatibility**: Works with Claude Code, Cursor, Windsurf, Copilot, Cline, Aider, or any AI assistant that can read/write files
- **Zero Dependencies**: Uses only Node.js built-in APIs
- **File-Based State**: All state is stored in JSON files, enabling multi-process coordination
- **Concurrent Safe**: Multiple agents can read/write simultaneously without conflicts

## Directory Structure

```
.any-project/
├── .imece/                          # İmece workspace (hidden)
│   ├── imece.json                   # Swarm metadata + config
│   ├── agents/                      # One JSON per agent
│   │   ├── ali.json
│   │   └── zeynep.json
│   ├── inbox/                       # Per-agent message queues
│   │   ├── ali/
│   │   │   ├── msg_kx7f2_from_zeynep.json
│   │   │   └── .processed/
│   │   └── zeynep/
│   ├── tasks/                       # Kanban: backlog/ active/ done/
│   │   ├── backlog/
│   │   ├── active/
│   │   └── done/
│   ├── timeline.jsonl               # Append-only event log
│   └── locks/                       # File-level edit locks
│       └── src__api__users.ts.lock.json
├── .skills/imece/SKILL.md           # Teaches any AI the imece protocol
└── AGENTS.md                        # Human-readable agent documentation
```

## Key Design Decisions

### 1. File-Based State
- No database, no server, no sockets
- State is determined by file location (e.g., a task in `tasks/active/` is active)
- Atomic writes using temp+rename pattern

### 2. Agent Identity
- Each agent has a unique name (lowercase, alphanumeric + hyphens, max 20 chars)
- Agents self-register with role, capabilities, and model info
- Heartbeat mechanism tracks agent liveness

### 3. Message Passing
- Inbox pattern: each agent has their own message queue directory
- Message types: message, task-delegate, question, status-update, review-request, approval, rejection, blocker, handoff
- Support for reply threading

### 4. Task Management
- Kanban-style: tasks move between backlog/active/done directories
- Dependency tracking via `blockedBy` array
- Task delegation through messages

### 5. File Locking
- Advisory locking to prevent edit conflicts
- Lock files encode path (e.g., `src/api/users.ts` → `src__api__users.ts.lock.json`)
- Stale lock detection and cleanup

### 6. Timeline
- Append-only JSONL event log
- Every mutation emits a timeline event
- Enables debugging and audit trails

## Type System

See `src/types.ts` for complete type definitions. All types are explicit with no `any`.

## API Surface

### ImeceManager
- `init(description?)` - Initialize imece workspace
- `isInitialized()` - Check if workspace exists
- `getConfig()` - Get configuration
- `getStatus(options?)` - Get full status snapshot
- `setupGitignore()` - Add .imece/ to .gitignore
- `installSkill(targetDir?)` - Install SKILL.md
- `generatePrompt(name, role, options?)` - Generate agent system prompt
- `reset()` - Reset workspace (destructive)

### AgentManager
- `register(options)` - Register new agent
- `get(name)` - Get agent profile
- `list()` - List all agents
- `listActive(staleThreshold?)` - List active agents
- `updateStatus(name, status, currentTask?)` - Update agent status
- `heartbeat(name)` - Update lastSeen timestamp
- `setWorkingFiles(name, files)` - Set files agent is working on
- `goOffline(name)` - Mark agent offline
- `remove(name)` - Remove agent
- `exists(name)` - Check if agent exists
- `getLead()` - Get team lead
- `setLead(name)` - Set team lead
- `updateMeta(name, meta)` - Update agent metadata

### Messenger
- `send(options)` - Send message to agent
- `getInbox(agent)` - Get agent's inbox messages
- `unreadCount(agent)` - Count unread messages
- `getMessage(agent, msgId)` - Get specific message
- `markAsRead(agent, msgId)` - Mark message as read
- `markAllAsRead(agent)` - Mark all messages as read
- `reply(agent, msgId, body)` - Reply to message
- `getProcessed(agent)` - Get processed messages
- `getThread(agent1, agent2)` - Get conversation thread

### TaskBoard
- `create(options)` - Create new task
- `claim(taskId, agent)` - Claim task for agent
- `complete(taskId, note?)` - Mark task complete
- `block(taskId, reason)` - Block task
- `unblock(taskId)` - Unblock task
- `addNote(taskId, agent, text)` - Add note to task
- `listByStatus(status)` - List tasks by status
- `all()` - Get all tasks
- `find(taskId)` - Find task by ID
- `delegate(task, messenger)` - Delegate task via message
- `getAgentTasks(agent)` - Get tasks assigned to agent
- `isUnblocked(taskId)` - Check if task dependencies are satisfied

### Timeline
- `append(event)` - Append event to timeline
- `recent(limit?)` - Get recent events
- `all()` - Get all events
- `byType(eventType)` - Filter by event type
- `byAgent(agent)` - Filter by agent
- `search(query)` - Search events
- `range(from, to)` - Get events in time range
- `broadcast(agent, message, data?)` - Broadcast message

### FileLocker
- `lock(agent, file, reason?)` - Lock file
- `unlock(agent, file, force?)` - Unlock file
- `isLocked(file)` - Check if file is locked
- `listLocks()` - List all active locks
- `agentLocks(agent)` - Get locks by agent
- `hasConflict(agent, file)` - Check for lock conflict
- `releaseAll(agent)` - Release all agent locks
- `cleanStale(threshold, agents)` - Clean stale locks

## CLI Commands

```
imece init [--desc <text>]
imece status
imece reset

imece register <name> <role> [--caps <c1,c2>] [--model <model>] [--lead]
imece whoami <name>
imece agents
imece heartbeat <name>
imece offline <name>

imece send <from> <to> <subject> [--body <text>] [--type <type>] [--priority <p>]
imece inbox <agent> [--all]
imece read <agent> <msg-id>
imece reply <agent> <msg-id> <body>
imece thread <agent1> <agent2>

imece task create <from> <to> <title> [--desc <text>] [--criteria <c1,c2>] [--priority <p>] [--tags <t1,t2>]
imece task list [--status <s>] [--agent <n>]
imece task show <task-id>
imece task claim <task-id> <agent>
imece task complete <task-id> [--note <text>]
imece task delegate <from> <to> <title> [--desc <text>] [--criteria <c1,c2>]
imece task block <task-id> <reason>
imece task unblock <task-id>
imece task note <task-id> <agent> <text>

imece broadcast <agent> <message>
imece timeline [--limit <n>] [--agent <n>] [--type <event-type>]
imece search <query>

imece lock <agent> <filepath>
imece unlock <agent> <filepath>
imece locks

imece install-skill [--dir <path>]
imece prompt <name> <role> [--caps <c1,c2>] [--model <model>]
```

## Non-Negotiable Rules

1. **Zero Runtime Dependencies** - Only Node.js built-in APIs
2. **TypeScript Strict** - strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns
3. **ESM Only** - `"type": "module"`, all imports use `.js` extension
4. **100% Test Coverage** - Vitest for all branches and error paths
5. **LLM-Native** - llms.txt, predictable API naming, JSDoc with @example

## Naming Conventions

- Directory: `.imece/` (NOT `.swarm/`)
- Config file: `imece.json` (NOT `swarm.json`)
- CLI command: `imece` (NOT `swarm`)
- Class name: `ImeceManager` (NOT `SwarmManager`)
- Type prefix: `Imece` (ImeceMessage, ImeceTask, ImeceConfig, ImeceStatus)
