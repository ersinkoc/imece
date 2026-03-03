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

# imece Multi-Agent Coordination Protocol

**imece** (Turkish: /imeˈdʒe/) — An Anatolian tradition where an entire village comes together to accomplish a task no single person could do alone.

This skill enables you to participate in a coordinated swarm of AI assistants working together on the same codebase.

## Session Start Checklist

**CRITICAL**: Run these commands at the start of EVERY session:

```bash
# 1. Check for messages
npx @oxog/imece inbox <your-name>

# 2. Check swarm status
npx @oxog/imece status

# 3. Send heartbeat
npx @oxog/imece heartbeat <your-name>

# 4. Broadcast your presence (optional but recommended)
npx @oxog/imece broadcast <your-name> "<your-name> is online and ready"
```

## Quick Command Reference

| Action | Command |
|--------|---------|
| Check messages | `npx @oxog/imece inbox <name>` |
| Send message | `npx @oxog/imece send <from> <to> "Subject" --body "Message"` |
| Reply | `npx @oxog/imece reply <name> <msg-id> "Response"` |
| Create task | `npx @oxog/imece task create <from> <to> "Title" --desc "Details"` |
| Claim task | `npx @oxog/imece task claim <task-id> <name>` |
| Complete task | `npx @oxog/imece task complete <task-id> --note "Done"` |
| Lock file | `npx @oxog/imece lock <name> <filepath>` |
| Unlock file | `npx @oxog/imece unlock <name> <filepath>` |
| List locks | `npx @oxog/imece locks` |
| Broadcast | `npx @oxog/imece broadcast <name> "Message"` |
| Check status | `npx @oxog/imece status` |

## 10 Behavioral Rules

1. **ALWAYS check inbox first** — Never start work without checking for messages
2. **Lock before editing** — Always lock files before making changes
3. **Respond to messages** — Reply to messages within a reasonable time
4. **Update status** — Set status to 'busy' when working, 'idle' when waiting
5. **Claim tasks explicitly** — Don't work on tasks without claiming them
6. **Complete tasks properly** — Use the complete command, not manual file edits
7. **Broadcast significant events** — Let others know when you start major work
8. **Respect locks** — Never edit files locked by other agents
9. **Clean up on exit** — Release locks and go offline before ending session
10. **Be helpful** — Assist other agents who ask for help

## Workflow Patterns

### Receiving a Task

1. Check inbox: `npx @oxog/imece inbox <your-name>`
2. Read message: `npx @oxog/imece read <your-name> <msg-id>`
3. Reply with acknowledgment: `npx @oxog/imece reply <your-name> <msg-id> "I'll start on this"`
4. Claim the task: `npx @oxog/imece task claim <task-id> <your-name>`
5. Update status: `npx @oxog/imece heartbeat <your-name>` (sets to online/busy)
6. Lock files: `npx @oxog/imece lock <your-name> <filepath>`
7. Do the work
8. Complete task: `npx @oxog/imece task complete <task-id> --note "All done"`
9. Unlock files: `npx @oxog/imece unlock <your-name> <filepath>`

### Asking for Help

1. Identify who can help (check `npx @oxog/imece status` for capabilities)
2. Send message: `npx @oxog/imece send <you> <them> "Need help with X" --body "Details..."`
3. Wait for reply (check inbox periodically)
4. If urgent, use `--priority urgent` flag

### Delegating Work

1. Create task: `npx @oxog/imece task create <you> <them> "Title" --desc "Details" --criteria "Acceptance criteria"`
2. This automatically sends them a message
3. Follow up if no response in reasonable time

## File Locking Protocol

**CRITICAL**: Always follow this protocol:

```bash
# 1. Check existing locks
npx @oxog/imece locks

# 2. Lock your target files
npx @oxog/imece lock <your-name> src/api/users.ts
npx @oxog/imece lock <your-name> src/api/auth.ts

# 3. Do your edits

# 4. Unlock when done
npx @oxog/imece unlock <your-name> src/api/users.ts
npx @oxog/imece unlock <your-name> src/api/auth.ts
```

## Conflict Prevention

- Check locks before editing ANY file
- Lock all files you plan to touch
- Keep locks for minimum time needed
- Release locks before long operations (tests, builds)
- Use `npx @oxog/imece locks` to see all active locks

## Self-Introduction Template

When joining a swarm for the first time:

```bash
npx @oxog/imece register <name> <role> --caps "cap1,cap2,cap3" --model "<your-model>"
npx @oxog/imece broadcast <name> "Hello! I'm <name>, a <role>. My capabilities: <caps>. Ready to help!"
```

## Message Types

- `message` — General communication
- `task-delegate` — Task assignment (auto-created)
- `question` — Question needing answer
- `status-update` — Status update
- `review-request` — Code review request
- `approval` — Work approval
- `rejection` — Work rejection with feedback
- `blocker` — Blocking issue
- `handoff` — Work handoff

## Universal Compatibility

This protocol works with:
- **Claude Code** — Native Agent Teams inspired this
- **Cursor** — Works via terminal commands
- **Windsurf** — Works via terminal commands
- **GitHub Copilot** — Works via terminal commands
- **Cline** — Works via terminal commands
- **Aider** — Works via terminal commands
- **Any AI** — That can read/write files and run commands

## Directory Structure

```
.imece/
├── imece.json          # Config
├── agents/             # Agent profiles
├── inbox/              # Message queues
│   ├── <agent>/
│   └── <agent>/.processed/
├── tasks/              # Kanban board
│   ├── pending/
│   ├── active/
│   ├── done/
│   └── blocked/
├── locks/              # File locks
└── timeline.jsonl      # Event log
```

## Emergency Procedures

### If you crash with locks held

Other agents can force unlock:
```bash
npx @oxog/imece unlock <your-name> <filepath> --force
```

### If you need to leave urgently

1. Release all locks: `npx @oxog/imece unlock <name> <each-file>`
2. Go offline: `npx @oxog/imece offline <name>`

### If swarm seems stuck

Check the timeline for recent activity:
```bash
npx @oxog/imece timeline --limit 20
```

---

**Remember**: imece is about working together. Communication is key!
