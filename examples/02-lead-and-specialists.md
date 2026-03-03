# Example 2: Lead and Specialists

This example shows a team with a lead architect and multiple specialists.

## Team Structure

| Agent | Role | Capabilities | Tool |
|-------|------|--------------|------|
| Ayşe | Lead Architect | architecture, api, database, review, coordination | Claude Code |
| Mehmet | Backend Dev | nodejs, api, database, testing | Cursor |
| Elif | Frontend Dev | react, css, typescript, accessibility | Cursor |
| Can | DevOps Engineer | docker, kubernetes, ci-cd, aws | Windsurf |

## Setup

### Initialize and Register

```bash
# Initialize
npx imece init --desc "E-commerce platform team"

# Lead (Ayşe) - registers first and sets the tone
npx imece register ayse "lead-architect" \
  --caps "architecture,api,database,review,coordination" \
  --model "claude-opus-4-6" \
  --lead

# Specialists
npx imece register mehmet "backend-dev" \
  --caps "nodejs,api,database,testing" \
  --model "cursor"

npx imece register elif "frontend-dev" \
  --caps "react,css,typescript,accessibility" \
  --model "cursor"

npx imece register can "devops-engineer" \
  --caps "docker,kubernetes,ci-cd,aws" \
  --model "windsurf"
```

### Broadcast Team Formation

Ayşe broadcasts the team formation:

```bash
npx imece broadcast ayse "Team assembled! Ayşe (lead), Mehmet (backend), Elif (frontend), Can (devops). E-commerce platform project starting."
```

## Work Patterns

### Pattern 1: Architecture → Implementation

1. **Ayşe designs, delegates to specialists:**

```bash
# Create architecture task for herself
npx imece task create ayse ayse "Design API architecture" \
  --desc "Design REST API for e-commerce platform" \
  --criteria "API spec document,Database schema,Authentication flow,Rate limiting strategy" \
  --priority urgent

# Work on it, then when done...

# Delegate implementation to Mehmet
npx imece task create ayse mehmet "Implement user API" \
  --desc "Implement the user management API per the architecture doc" \
  --criteria "CRUD endpoints,JWT auth,Input validation,Unit tests" \
  --priority high

# Parallel: Delegate frontend to Elif
npx imece task create ayse elif "Build auth UI" \
  --desc "Create login/register UI components" \
  --criteria "Login form,Register form,Error handling,Loading states" \
  --priority high \
  --tags "ui,auth"
```

2. **Mehmet implements backend:**

```bash
npx imece inbox mehmet
npx imece task claim <user-api-task-id> mehmet

# Lock files
npx imece lock mehmet src/api/users.ts
npx imece lock mehmet src/api/auth.ts

# Work...

npx imece task note <task-id> mehmet "JWT implementation complete"
npx imece task note <task-id> mehmet "All endpoints implemented, starting tests"

npx imece task complete <task-id> mehmet --note "100% test coverage"
npx imece unlock mehmet src/api/users.ts
npx imece unlock mehmet src/api/auth.ts
```

3. **Elif implements frontend:**

```bash
npx imece inbox elif
npx imece task claim <auth-ui-task-id> elif

# Blocked: needs API endpoints
npx imece send elif mehmet "API endpoints ready?" --type question --priority high

# Wait for reply...
npx imece inbox elif

# Once unblocked, work and complete
npx imece task complete <task-id> --note "UI complete, waiting for API integration"
```

### Pattern 2: Code Review

Mehmet requests review from Ayşe:

```bash
npx imece send mehmet ayse "Review: User API implementation" \
  --body "I've implemented the user API per the architecture spec. Please review src/api/users.ts and src/api/auth.ts" \
  --type review-request \
  --priority normal
```

Ayşe reviews and provides feedback:

```bash
npx imece inbox ayse
npx imece read ayse <msg-id>

# After reviewing code...
npx imece send ayse mehmet "Review feedback" \
  --body "Great work! A few suggestions:\n1. Add rate limiting middleware\n2. Consider pagination for list endpoints\n3. Error messages could be more specific" \
  --type message
```

Mehmet addresses feedback:

```bash
npx imece reply mehmet <msg-id> "Thanks for the feedback! Working on these now."

# Lock and edit
npx imece lock mehmet src/api/users.ts
# ... make changes ...
npx imece unlock mehmet src/api/users.ts

npx imece send mehmet ayse "Changes complete" --type approval
```

### Pattern 3: DevOps Integration

Can sets up infrastructure:

```bash
npx imece task create ayse can "Set up CI/CD pipeline" \
  --desc "Create GitHub Actions workflow for testing and deployment" \
  --criteria "Test workflow,Build workflow,Deploy to staging,Deploy to production" \
  --priority high

npx imece inbox can
npx imece task claim <cicd-task-id> can

# Lock CI config
npx imece lock can .github/workflows/

# Work and complete
npx imece task complete <task-id> can --note "Pipeline running at https://github.com/..."
```

## Communication Protocols

### Daily Standup (Async)

Each agent broadcasts their status:

```bash
npx imece broadcast ayse "Standup: Reviewing Mehmet's API PR, designing order service architecture"
npx imece broadcast mehmet "Standup: Completed user API, starting product API today"
npx imece broadcast elif "Standup: Auth UI done, blocked on product API endpoints"
npx imece broadcast can "Standup: CI/CD pipeline complete, working on Docker config"
```

### Blockers

When blocked, communicate clearly:

```bash
npx imece send elif mehmet "BLOCKED: Product API endpoints" \
  --body "I need these endpoints to continue:\n- GET /api/products\n- GET /api/products/:id\n- POST /api/products (admin)" \
  --type blocker \
  --priority urgent

# Mehmet responds
npx imece reply mehmet <msg-id> "Working on it now. ETA: 2 hours."
```

### Handoffs

When passing work between agents:

```bash
# Mehmet completes backend, hands off to Elif
npx imece task create mehmet elif "Integrate product API" \
  --desc "Backend endpoints are ready. See docs/api/products.md" \
  --criteria "Product list page,Product detail page,Add to cart functionality" \
  --tags "integration,frontend"

npx imece send mehmet elif "Backend ready for integration" \
  --body "All endpoints documented in docs/api/. Let me know if you need any changes!" \
  --type handoff
```

## Conflict Prevention

### File Locking Etiquette

1. **Lock before editing:**
```bash
npx imece lock <name> src/api/users.ts
```

2. **Check locks before starting:**
```bash
npx imece locks
```

3. **Release quickly:**
```bash
# Don't hold locks during long operations
npx imece unlock <name> src/api/users.ts
# Run tests...
# Re-lock if needed
```

### Stale Lock Cleanup

If an agent crashes with locks held, the lead can force unlock:

```bash
npx imece unlock mehmet src/api/users.ts --force
```

## Monitoring

### View Team Status

```bash
npx imece status
```

Shows:
- All agents and their status
- Task summary (backlog/active/done/blocked)
- Active locks
- Recent timeline events

### Check Timeline

```bash
npx imece timeline --limit 20
```

### Search History

```bash
npx imece search "authentication"
```

## Key Takeaways

1. **Lead coordinates** — Ayşe designs and delegates
2. **Specialists focus** — Each agent has clear responsibilities
3. **Communicate blockers** — Don't stay blocked silently
4. **Request reviews** — Quality through collaboration
5. **Broadcast updates** — Keep everyone informed
6. **Lock your files** — Prevent conflicts
7. **Hand off cleanly** — Document and communicate transfers

## Next Steps

See [03-code-review-pipeline.md](03-code-review-pipeline.md) for a review-focused workflow.