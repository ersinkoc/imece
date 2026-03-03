---
name: imece-status
description: Check imece swarm status. Run this at the start of every session.
---

# Check imece Status

**CRITICAL**: Always run this at the start of your session.

## Why

- See who's online and available
- Check for messages waiting for you
- Know what tasks are active
- Avoid file conflicts
- Stay coordinated with the team

## Command

```bash
imece status
```

## Shows

```
🤝 İMECE STATUS
Project: my-app

👥 AGENTS (2 online, 0 offline)
┌──────────┬────────────┬──────────┬──────────────┬────┐
│ Name     │ Role       │ Status   │ Current Task │ 📬 │
├──────────┼────────────┼──────────┼──────────────┼────┤
│ 👑 ali   │ architect  │ 🟢 online│              │  0 │
│ zeynep   │ tester     │ 🟡 busy  │ Writing tests│  2 │
└──────────┴────────────┴──────────┴──────────────┴────┘

📋 TASKS
  Backlog: 3  │  Active: 1  │  Done: 5  │  Blocked: 0

🔒 LOCKS (1 active)
  src/api/users.ts → zeynep (5 min ago)

📢 RECENT TIMELINE
  [zeynep] 🔄 Claimed task: Write tests... (2 min ago)
  [ali] 🔒 Locked: src/api/users.ts (10 min ago)
```

## Follow-up Commands

After checking status, always:

```bash
# Check your messages
imece inbox <your-name>

# Send heartbeat (shows you're active)
imece heartbeat <your-name>

# Check file locks before editing
imece locks
```

## When to Check

- **Start of session**: Before doing any work
- **Before editing files**: To avoid conflicts
- **After idle time**: If you stepped away
- **When coordinating**: Before sending messages
- **Regularly**: Every 15-30 minutes during active work

## Session Start Checklist

```bash
# 1. Check status
imece status

# 2. Check inbox
imece inbox <your-name>

# 3. Send heartbeat
imece heartbeat <your-name>

# 4. Check locks before editing
imece locks

# 5. Start working
```
