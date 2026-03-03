# Example 4: TDD Pair Programming

This example demonstrates Test-Driven Development (TDD) with two agents pair programming.

## The TDD Cycle

1. **Red** — Write a failing test
2. **Green** — Write minimal code to pass
3. **Refactor** — Improve code while keeping tests green

With two agents:
- **Ali** (Test Driver) — Writes tests
- **Zeynep** (Implementer) — Makes tests pass

## Setup

```bash
npx imece init --desc "TDD Pair Programming Demo"

npx imece register ali "test-driver" --caps "tdd,testing,typescript" --lead
npx imece register zeynep "implementer" --caps "typescript,algorithms,refactoring"
```

## The Pairing Session

### Round 1: Calculator Addition

#### Step 1: Ali Writes Failing Test

```bash
# Ali locks the test file
npx imece lock ali src/calculator.test.ts

# Writes the test...
# test('adds 1 + 2 to equal 3', () => {
#   expect(add(1, 2)).toBe(3);
# });

# Ali unlocks
npx imece unlock ali src/calculator.test.ts

# Notifies Zeynep
npx imece send ali zeynep "TDD Round 1: Addition" \
  --body "I've written a failing test for the add() function.\n\nTest: src/calculator.test.ts\nExpected: add(1, 2) === 3\n\nMake it pass!" \
  --type task-delegate
```

#### Step 2: Zeynep Makes It Pass

```bash
npx imece inbox zeynep

# Lock implementation file
npx imece lock zeynep src/calculator.ts

# Writes minimal implementation:
# export const add = (a: number, b: number) => a + b;

# Runs tests — they pass!

# Unlocks
npx imece unlock zeynep src/calculator.ts

# Notifies Ali
npx imece send zeynep ali "Round 1: Green! ✅" \
  --body "Implemented add() function. Tests passing.\n\nReady for next test!" \
  --type status-update
```

### Round 2: Edge Cases

#### Step 1: Ali Adds More Tests

```bash
npx imece lock ali src/calculator.test.ts

# Adds tests:
# test('handles negative numbers', () => {
#   expect(add(-1, -2)).toBe(-3);
# });
# test('handles zero', () => {
#   expect(add(0, 5)).toBe(5);
# });

npx imece unlock ali src/calculator.test.ts

npx imece send ali zeynep "TDD Round 2: Edge Cases" \
  --body "Added tests for negative numbers and zero.\n\nAll currently failing. Make them pass!" \
  --type task-delegate
```

#### Step 2: Zeynep Verifies and Responds

```bash
npx imece lock zeynep src/calculator.test.ts
# Runs tests
# All pass! (implementation already handles these)
npx imece unlock zeynep src/calculator.test.ts

npx imece send zeynep ali "Round 2: Already Green! ✅" \
  --body "The existing implementation handles all edge cases. Tests pass!" \
  --type approval
```

### Round 3: Subtraction (Red Phase)

```bash
# Ali writes failing test
npx imece lock ali src/calculator.test.ts
# test('subtracts 5 - 3 to equal 2', () => {
#   expect(subtract(5, 3)).toBe(2);
# });
npx imece unlock ali src/calculator.test.ts

npx imece send ali zeynep "TDD Round 3: Subtraction" \
  --body "New test for subtract() function.\n\nTest: subtract(5, 3) === 2\nStatus: 🔴 Failing" \
  --type task-delegate
```

### Round 4: Zeynep Implements

```bash
npx imece lock zeynep src/calculator.ts
# export const subtract = (a: number, b: number) => a - b;
npx imece unlock zeynep src/calculator.ts

npx imece send zeynep ali "Round 4: Green! ✅" \
  --body "subtract() implemented. All tests pass!" \
  --type status-update
```

## Refactoring Phase

After several cycles, they refactor together:

### Step 1: Ali Identifies Need

```bash
npx imece send ali zeynep "Refactor: Extract Operation Type" \
  --body "I notice we're repeating the function signature pattern.\n\nLet's refactor to use an Operation type:\n\n```ts\ntype Operation = (a: number, b: number) => number;\n```\n\nThis will make the code more maintainable. I'll lock and refactor the types." \
  --type message

npx imece lock ali src/calculator.ts
# Refactors to use Operation type
npx imece lock ali src/calculator.test.ts
# Updates tests to use shared type
npx imece unlock ali src/calculator.test.ts
npx imece unlock ali src/calculator.ts

npx imece send ali zeynep "Refactor Complete" \
  --body "Extracted Operation type. Tests still green! ✅" \
  --type status-update
```

### Step 2: Zeynep Reviews

```bash
npx imece inbox zeynep

# Reviews the refactor
npx imece send zeynep ali "Refactor LGTM! ✅" \
  --body "The Operation type makes the code much cleaner. Good catch!" \
  --type approval
```

## Session Management

### Starting a Session

```bash
# Both agents check in
npx imece inbox ali
npx imece inbox zeynep

npx imece heartbeat ali
npx imece heartbeat zeynep

npx imece broadcast ali "Starting TDD pair session with Zeynep"
npx imece broadcast zeynep "Ready to pair with Ali on calculator feature"
```

### During the Session

Track progress with tasks:

```bash
# Create tracking task
npx imece task create ali zeynep "TDD: Calculator Module" \
  --desc "Implement calculator using TDD" \
  --criteria "Addition with tests,Subtraction with tests,Multiplication with tests,Division with tests,Edge cases handled,Refactoring complete"

# Zeynep claims
npx imece task claim <task-id> zeynep

# As they complete features, add notes
npx imece task note <task-id> zeynep "Addition feature complete - 3 test cycles"
npx imece task note <task-id> zeynep "Subtraction complete - 2 test cycles"
```

### Ending a Session

```bash
# Mark task progress
npx imece task note <task-id> zeynep "Session complete: 4 operations implemented, 1 refactor"

# Both go idle
npx imece heartbeat ali  # Sets to online/idle
npx imece heartbeat zeynep

# Broadcast completion
npx imece broadcast ali "TDD session complete. Calculator module 80% done."
```

## Rotating Roles

To keep it fair, rotate roles every 30 minutes or after each feature:

```bash
# After addition feature, swap roles
npx imece send zeynep ali "Role swap" \
  --body "I'll write the tests for multiplication, you implement. Ready?" \
  --type message

# Now Zeynep is Test Driver, Ali is Implementer
```

## Handling Disagreements

If Ali and Zeynep disagree on implementation:

```bash
# Zeynep suggests different approach
npx imece send zeynep ali "Alternative implementation" \
  --body "Instead of separate functions, what about a Calculator class?\n\nPros:\n- Can track history\n- Chain operations\n- More extensible\n\nCons:\n- More complex\n- Breaking change\n\nThoughts?" \
  --type question

# Ali responds
npx imece reply ali <msg-id> "Good idea! Let's go with the class approach. I'll write the test structure."
```

## Async TDD

For asynchronous pairing (different schedules):

```bash
# Ali leaves a failing test for Zeynep
npx imece send ali zeynep "TDD: Async Round" \
  --body "I've left a failing test for the multiply function.\n\nWhen you get a chance:\n1. Check src/calculator.test.ts\n2. Make the test pass\n3. Send me the results\n\nNo rush!" \
  --type task-delegate

# Zeynep responds hours later
npx imece send zeynep ali "Multiply: Green! ✅" \
  --body "Implemented multiply(). Left a new failing test for divide() - your turn!" \
  --type task-delegate
```

## Best Practices

### For Test Drivers (Ali)

1. **Write minimal failing tests** — One concept at a time
2. **Clear failure messages** — Tests should explain what's wrong
3. **Edge cases early** — Don't forget negatives, zeros, boundaries
4. **Refactor tests too** — Tests are code too

### For Implementers (Zeynep)

1. **Minimal implementation** — Just enough to pass
2. **No premature optimization** — Refactor comes after green
3. **Ask for clarification** — If test intent is unclear
4. **Suggest test additions** — If you spot missing cases

### For Both

1. **Lock files** — Prevent conflicts
2. **Run tests frequently** — After every change
3. **Communicate clearly** — Explain your thinking
4. **Stay in sync** — Use heartbeat to show you're active
5. **Take breaks** — TDD is intense, rest is important

## Tracking Progress

```bash
# See all TDD cycles
npx imece timeline | grep -E "(test|implement|refactor)"

# Check test coverage discussions
npx imece search "test"

# See who did what
npx imece timeline --agent ali
npx imece timeline --agent zeynep
```

## Key Takeaways

1. **Red-Green-Refactor** — Strict cycle, don't skip phases
2. **Lock during changes** — Essential for pair programming
3. **Communicate constantly** — Explain your reasoning
4. **Rotate roles** — Keep both agents engaged
5. **Track with tasks** — Formalize the session
6. **Async possible** — Leave work for each other
7. **Celebrate green** — Acknowledge progress

## Next Steps

See [05-full-stack-team.md](05-full-stack-team.md) for a full team coordination example.