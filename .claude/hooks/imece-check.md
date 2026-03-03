---
name: imece-check
description: Check imece inbox and tasks at session start. Each agent must set their own name.
trigger: session_start
---

# Check imece Status

> ⚠️ **IMPORTANT**: Each agent MUST set their own `IMECE_AGENT` environment variable!

## Setup (REQUIRED - Per Agent)

Each AI assistant must configure their own agent name:

```bash
# Set YOUR agent name (replace <your-name> with your actual agent name)
export IMECE_AGENT=<your-name>

# Examples:
# export IMECE_AGENT=claude
# export IMECE_AGENT=minimax
# export IMECE_AGENT=qweniche
# export IMECE_AGENT=kimibey
```

## Usage

```bash
# Check all (requires IMECE_AGENT env var)
imece check

# Or pass agent name directly
imece check <your-agent-name>

# Auto mark messages as read
imece check --auto
```

This will show:
- 📬 Unread messages
- 🔄 Active tasks
- 📋 Pending tasks
- 🔒 Your file locks
- 📢 Recent team activity

## Agent-Specific Configuration

Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# === IMECE AGENT CONFIG ===
# Replace with YOUR agent name
export IMECE_AGENT="your-agent-name"
```

## For Project-Specific Setup

Create `.env` file in project root (DO NOT COMMIT):

```bash
# .env - Each agent has their own copy
IMECE_AGENT=your-agent-name
```
