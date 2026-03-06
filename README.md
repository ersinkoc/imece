# 🤝 imece

> Universal multi-agent coordination for AI code assistants — like *imece*, the Anatolian tradition of working together

[![npm](https://img.shields.io/npm/v/@oxog/imece)](https://www.npmjs.com/package/@oxog/imece)
[![CI](https://github.com/ersinkoc/imece/actions/workflows/ci.yml/badge.svg)](https://github.com/ersinkoc/imece/actions)
[![license](https://img.shields.io/npm/l/imece)](LICENSE)
[![coverage](https://img.shields.io/badge/coverage-98.53%25-brightgreen)]()

## What is imece?

**imece** (/imeˈdʒe/) is a Turkish tradition where an entire village comes together to accomplish a task no single person could do alone.

**This package** brings that same spirit to AI code assistants. It's a file-based IPC (Inter-Process Communication) system that lets multiple AI agents coordinate, communicate, and collaborate on the same codebase — regardless of which AI tools you're using.

### The Problem

- Claude Code has an experimental "Agent Teams" feature, but it's Claude-only
- You want to use Claude for architecture, Cursor for frontend, and a local model for tests
- Multiple AI assistants working on the same files = conflicts and confusion

### The Solution

imece provides:
- 📬 **Inbox messaging** — Agents send messages to each other
- 📋 **Shared task board** — Kanban-style task management
- 🔒 **File locking** — Prevent edit conflicts
- 📢 **Timeline** — Append-only event log for transparency
- 🌐 **Universal** — Works with Claude, Cursor, Windsurf, Copilot, Cline, Aider, or any AI that can read/write files

## Installation

```bash
# Install locally in your project
npm install --save-dev @oxog/imece

# Or use npx (no install needed)
npx @oxog/imece <command>
```

Requirements: Node.js ≥ 22

## Quick Start

```bash
# 1. Initialize imece in your project
npx @oxog/imece init --desc "Multi-agent web app"

# 2. Register your first agent
npx @oxog/imece register ali architect --caps "arch,api,db" --lead

# 3. Check status
npx @oxog/imece status

# 4. Ali sends a task to another agent (when they're registered)
npx @oxog/imece task create ali zeynep "Build auth API" --priority high

# 5. Zeynep checks her inbox
npx @oxog/imece inbox zeynep

# 6. Zeynep locks files before editing
npx @oxog/imece lock zeynep src/api/auth.ts

# 7. Zeynep completes the task
npx @oxog/imece task complete <task-id> --note "All tests passing"
```

## How It Works

imece uses a simple file-based protocol:

```
your-project/
├── .imece/                    # imece workspace
│   ├── imece.json            # Configuration
│   ├── agents/               # Agent profiles
│   │   ├── ali.json
│   │   └── zeynep.json
│   ├── inbox/                # Message queues
│   │   ├── ali/
│   │   └── zeynep/
│   ├── tasks/                # Kanban board
│   │   ├── pending/
│   │   ├── active/
│   │   ├── done/
│   │   └── blocked/
│   ├── locks/                # File locks
│   └── timeline.jsonl        # Event log
└── .skills/imece/SKILL.md    # AI skill file
```

State is stored in JSON files. No database, no server, no sockets. Just files that any AI assistant can read and write.

## CLI Commands

### Core
```bash
imece init [--desc <text>]     # Initialize workspace
imece status                   # Show full status
imece reset --confirm          # Reset everything
```

### Agents
```bash
imece register <name> <role> [--caps <list>] [--model <m>] [--lead]
imece whoami <name>
imece agents
imece heartbeat <name>
imece offline <name>
```

### Messages
```bash
imece send <from> <to> <subject> [--body <text>] [--type <type>] [--priority <p>]
imece inbox <agent> [--all]
imece read <agent> <msg-id>
imece reply <agent> <msg-id> <body>
imece thread <agent1> <agent2>
```

### Tasks
```bash
imece task create <from> <to> <title> [--desc <text>] [--criteria <list>] [--priority <p>]
imece task list [--status <s>] [--agent <n>]
imece task show <id>
imece task claim <id> <agent>
imece task complete <id> [--note <text>]
imece task block <id> <reason>
imece task unblock <id>
```

### Timeline & Broadcast
```bash
imece broadcast <agent> <message>
imece timeline [--limit <n>]
imece search <query>
```

### File Locking
```bash
imece lock <agent> <filepath>
imece unlock <agent> <filepath>
imece locks
```

### Utilities
```bash
imece install-skill [--dir <path>]
imece prompt <name> <role> [--caps <list>] [--model <m>]
```

## Using as a Library

```typescript
import { ImeceManager } from '@oxog/imece';

const imece = new ImeceManager();

// Initialize
await imece.init('My project');

// Register an agent
const agent = await imece.agents.register({
  name: 'ali',
  role: 'architect',
  capabilities: ['api-design', 'database'],
  isLead: true
});

// Send a message
await imece.messages.send({
  from: 'ali',
  to: 'zeynep',
  subject: 'Review needed',
  body: 'Can you review the auth module?',
  priority: 'high',
  expectsReply: true
});

// Create a task
const task = await imece.tasks.create({
  createdBy: 'ali',
  assignedTo: 'zeynep',
  title: 'Implement login',
  description: 'Create the login endpoint',
  acceptanceCriteria: ['JWT tokens', 'Password hashing', 'Rate limiting'],
  priority: 'high'
});

// Lock a file
await imece.locks.lock('zeynep', 'src/auth.ts');

// Get status
const status = await imece.getStatus();
console.log(status.taskSummary); // { backlog: 3, active: 2, done: 5, blocked: 1 }
```

## For AI Assistants

If you're an AI assistant reading this:

**At the start of EVERY session, run:**
```bash
# 1. Check for messages
npx @oxog/imece inbox <your-name>

# 2. Check swarm status
npx @oxog/imece status

# 3. Send heartbeat
npx @oxog/imece heartbeat <your-name>
```

**Before editing ANY file:**
```bash
npx @oxog/imece lock <your-name> <filepath>
```

**When done:**
```bash
npx @oxog/imece unlock <your-name> <filepath>
```

Install the skill file for complete protocol reference:
```bash
npx @oxog/imece install-skill
# Creates .skills/imece/SKILL.md
```

## Examples

### Two-Agent Workflow

```bash
# Terminal 1 - Claude Code as "ali" (Lead Architect)
npx @oxog/imece register ali "lead-architect" --caps "architecture,api,review" --lead

# Terminal 2 - Cursor as "zeynep" (Frontend Dev)
npx @oxog/imece register zeynep "frontend-dev" --caps "react,css,ui"

# Ali delegates work
npx @oxog/imece task create ali zeynep "Build login form" \
  --desc "Create a login form with email and password" \
  --criteria "Form validation,Error messages,Loading states" \
  --priority high

# Zeynep checks inbox, claims task, locks files, works, completes
npx @oxog/imece inbox zeynep
npx @oxog/imece task claim <task-id> zeynep
npx @oxog/imece lock zeynep src/components/LoginForm.tsx
# ... do work ...
npx @oxog/imece task complete <task-id> --note "Done with all criteria"
npx @oxog/imece unlock zeynep src/components/LoginForm.tsx

# Ali reviews
npx @oxog/imece send zeynep ali "Ready for review" --type status-update
```

See the `examples/` directory for more patterns.

## Architecture

imece is designed to be:

- **Zero dependencies** — Uses only Node.js built-in APIs
- **ESM only** — Modern JavaScript modules
- **TypeScript strict** — Full type safety
- **Atomic writes** — Temp + rename pattern prevents corruption
- **Concurrent safe** — Multiple agents can read/write simultaneously
- **Universal** — Works with any AI tool

## Why File-Based?

1. **Universal** — Every AI tool can read/write files
2. **Persistent** — State survives crashes and restarts
3. **Transparent** — Humans can inspect and modify state
4. **Version controlled** — `.imece/` can be git-ignored or committed
5. **Simple** — No servers, databases, or network dependencies

## Design Philosophy

- **Timeline is truth** — Every mutation emits an event
- **File location = state** — Task status determined by which directory it's in
- **Advisory locking** — Agents cooperate, not enforced
- **Communication over control** — Messages, not commands

## Limitations

- No real-time updates (poll with `imece status`)
- No built-in authentication (trust-based)
- File locking is advisory (agents must cooperate)
- Best for small-to-medium teams (≤10 agents)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Ersin Koç](https://github.com/ersinkoc)

## Acknowledgments

Inspired by:
- Claude Code's Agent Teams feature
- The Anatolian tradition of imece
- Unix philosophy: "Everything is a file"

---

**Happy swarming!** 🤝
