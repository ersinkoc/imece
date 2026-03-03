---
name: imece-join
description: Join the imece swarm as an agent. Use this when you start working on a project with imece.
---

# Join imece Swarm

Register yourself as an agent in this project's imece swarm.

## When to Use

- Starting work on a project with imece
- Opening a new terminal/session
- First time working on this codebase

## Steps

1. **Choose your role** based on the task at hand:
   - `architect` - System design, API design, code review
   - `developer` - Feature implementation, bug fixes
   - `tester` - Test writing, QA, test coverage
   - `reviewer` - Code review, PR review
   - `devops` - CI/CD, deployment, infrastructure
   - `docs` - Documentation, examples

2. **Run the join command**:
   ```bash
   imece join --name <your-name> --role <your-role> --caps "<cap1,cap2>" --model <model> [--lead]
   ```

3. **Verify registration**:
   ```bash
   imece status
   imece inbox <your-name>
   ```

4. **Announce yourself** (optional but recommended):
   ```bash
   imece broadcast <your-name> "<name> (<role>) is online and ready"
   ```

## Examples

```bash
# Join as team lead architect
imece join --name ali --role architect --caps "api,backend,review" --model claude-opus-4-6 --lead

# Join as tester
imece join --name zeynep --role tester --caps "unit-test,integration-test,e2e" --model claude-sonnet-4-6

# Join as developer
imece join --name mehmet --role developer --caps "frontend,react,typescript" --model gpt-4
```

## After Joining

Your agent profile is now active. Other agents can:
- Send you messages
- Delegate tasks to you
- See your status and capabilities

Remember to:
- Check your inbox regularly: `imece inbox <your-name>`
- Send heartbeats when active: `imece heartbeat <your-name>`
- Go offline when done: `imece offline <your-name>`

## Cross-Platform

This command works with any AI assistant that can run terminal commands:
- **Claude Code**: Use this slash command or `imece join`
- **Cursor**: Run `imece join` in terminal
- **Windsurf**: Run `imece join` in terminal
- **Copilot**: Run `imece join` in terminal
- **Cline**: Run `imece join` in terminal
- **Aider**: Run `imece join` in terminal
