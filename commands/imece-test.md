---
name: imece-test
description: Delegate test writing to the tester agent. Use this when you need tests written for your code.
---

# Delegate Tests

Automatically create and delegate a test task to the project's tester agent.

## When to Use

- You've written new code that needs tests
- You need to improve test coverage
- You want QA review of your implementation
- A bug was found and you want regression tests

## Command

```bash
# Auto-detect tester agent and delegate
imece test <filepath>

# Specify target agent explicitly
imece test <filepath> --to <agent-name>

# Add additional context
imece test <filepath> --desc "Focus on edge cases with null inputs"

# Combine options
imece test src/utils/auth.ts --to zeynep --desc "Add tests for token expiration"
```

## What Happens

1. **Task Created**: "Write tests for `<component>`"
2. **Auto-Assigned**: To the tester agent (first agent with `tester` role)
3. **Message Sent**: Tester receives notification in their inbox
4. **Task Queued**: Appears in their task list

## Test Task Includes

By default, the tester will create:
- Unit tests covering main functionality
- Edge case tests
- Integration tests (if applicable)
- Test coverage report

## After Delegating

The tester agent will:
1. **Claim** the task
2. **Lock** relevant files
3. **Write** comprehensive tests
4. **Run** tests to verify
5. **Complete** the task
6. **Notify** you via message

## Check Progress

```bash
# See all tasks
imece task list

# See specific task
imece task show <task-id>

# Read messages from tester
imece inbox <your-name>
```

## Best Practices

- **Lock your files** before the tester starts, so they know what's changing
- **Provide context** with `--desc` if there are specific requirements
- **Review tests** when complete - it's your code quality
- **Run tests** after they're written to verify they pass

## Example Workflow

```bash
# 1. You implement a feature
imece lock ali src/api/users.ts
# ... write code ...

# 2. Delegate tests
imece test src/api/users.ts --desc "Focus on validation errors"

# 3. Work on something else while tester writes tests

# 4. Check completion
imece inbox ali
imece task list

# 5. Review and run tests
npm test
```
