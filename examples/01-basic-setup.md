# Example 1: Basic Setup

This example shows how to set up a basic imece swarm with two agents.

## Scenario

- **Ali**: Lead architect, works in Claude Code
- **Zeynep**: Frontend developer, works in Cursor

## Setup

### Step 1: Initialize İmece

In your project directory:

```bash
npx imece init --desc "Two-agent web app project"
```

This creates the `.imece/` directory structure.

### Step 2: Register Ali (Terminal 1 - Claude Code)

```bash
# Ali's terminal (Claude Code)
npx imece register ali "lead-architect" \
  --caps "architecture,api-design,database,review" \
  --model "claude-opus-4-6" \
  --lead

# Verify
npx imece whoami ali
```

### Step 3: Register Zeynep (Terminal 2 - Cursor)

```bash
# Zeynep's terminal (Cursor)
npx imece register zeynep "frontend-dev" \
  --caps "react,css,typescript,ui-design" \
  --model "cursor"

# Verify
npx imece whoami zeynep
```

### Step 4: Check Status

In either terminal:

```bash
npx imece status
```

You should see both agents listed.

## First Interaction

### Ali Sends a Message

```bash
npx imece send ali zeynep "Welcome to the team" \
  --body "Hi Zeynep! Looking forward to working with you. I'll be handling the backend architecture." \
  --type message
```

### Zeynep Checks Inbox

```bash
npx imece inbox zeynep
```

Zeynep sees the message and can reply:

```bash
npx imece reply zeynep kx7f2a3b "Thanks Ali! Excited to be here."
```

## Creating the First Task

### Ali Creates a Task

```bash
npx imece task create ali zeynep "Create project structure" \
  --desc "Set up the React project with TypeScript, Vite, and basic folder structure" \
  --criteria "Vite + TypeScript configured,Folder structure created,ESLint + Prettier setup" \
  --priority high \
  --tags "setup,frontend"
```

Note the task ID (e.g., `task_abc123`) in the output.

### Zeynep Claims and Works

```bash
# 1. Check inbox for task
npx imece inbox zeynep

# 2. Claim the task
npx imece task claim abc123 zeynep

# 3. Lock relevant files before editing
npx imece lock zeynep package.json
npx imece lock zeynep vite.config.ts

# 4. Do the work (edit files...)

# 5. Add progress notes
npx imece task note abc123 zeynep "Vite configured with TypeScript"
npx imece task note abc123 zeynep "ESLint and Prettier added"

# 6. Complete the task
npx imece task complete abc123 --note "All criteria met, project ready for development"

# 7. Unlock files
npx imece unlock zeynep package.json
npx imece unlock zeynep vite.config.ts
```

### Ali Reviews

```bash
# Check timeline
npx imece timeline --limit 10

# Send acknowledgment
npx imece send zeynep ali "Great work!" --type approval
```

## Session Workflow

### When Starting Work

**Each agent should run at session start:**

```bash
# Check messages
npx imece inbox <your-name>

# Check status
npx imece status

# Update heartbeat
npx imece heartbeat <your-name>

# Broadcast availability (optional)
npx imece broadcast <your-name> "<name> is online"
```

### When Ending Work

```bash
# Complete or hand off any active tasks
# Release all locks
npx imece locks  # See what you have locked
npx imece unlock <your-name> <filepath>

# Go offline
npx imece offline <your-name>
```

## Key Takeaways

1. **Always check inbox first** — Before doing any work
2. **Lock files before editing** — Prevents conflicts
3. **Claim tasks explicitly** — Don't work on unclaimed tasks
4. **Update heartbeat regularly** — Lets others know you're active
5. **Broadcast major events** — Keep the team informed

## Next Steps

See [02-lead-and-specialists.md](02-lead-and-specialists.md) for a more complex team structure.