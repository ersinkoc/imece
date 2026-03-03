# İmece Implementation Guide

## Module Organization

### Core Modules (src/core/)

Each core module is a class that manages a specific domain:

1. **ImeceManager** (`imece.ts`) - Entry point and coordinator
2. **AgentManager** (`agent.ts`) - Agent lifecycle and profiles
3. **Messenger** (`messenger.ts`) - Message passing between agents
4. **TaskBoard** (`taskboard.ts`) - Task management and workflow
5. **Timeline** (`timeline.ts`) - Event logging and history
6. **FileLocker** (`locker.ts`) - File locking for conflict prevention

### Utilities (src/utils/)

1. **fs.ts** - Safe file operations with atomic writes
2. **id.ts** - ID generation (base36 timestamp + random)
3. **time.ts** - Timestamp helpers and relative time formatting
4. **path.ts** - Path encoding/decoding for lock files
5. **validate.ts** - Input validation functions

### CLI (src/cli/)

1. **index.ts** - CLI entry point and argument parsing
2. **ui.ts** - ANSI colors, box drawing, tables (zero dependencies)
3. **commands/** - Individual command implementations

## Implementation Patterns

### Atomic File Writes

All JSON writes must be atomic to prevent corruption:

```typescript
async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp.${generateId()}`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmpPath, filePath);
}
```

### Timeline Event Emission

Every mutation must emit a timeline event:

```typescript
// Pattern in each manager
await this.timeline.append({
  timestamp: now(),
  agent: agentName,
  event: 'task:created',
  message: `Created task: ${title}`,
  data: { taskId, assignedTo }
});
```

### Directory-Based State

Task status is determined by file location:

```typescript
// tasks/backlog/task_xxx.json -> status: 'pending'
// tasks/active/task_xxx.json -> status: 'active'
// tasks/done/task_xxx.json -> status: 'done'
```

### Error Handling

- Library code: throw descriptive errors, never call process.exit
- CLI code: catch errors and display user-friendly messages
- Always include context in error messages (e.g., "Agent 'ali' not found")

### Null Returns vs Throws

- `readJson` returns `null` on error (file not found is expected case)
- Validation functions throw on invalid input
- Getters return `null` or `undefined` when not found

## Build Configuration

### TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### tsup (tsup.config.ts)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
```

### Vitest (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/helpers/']
    }
  }
});
```

## Testing Strategy

### Test Structure

```
tests/
├── helpers/
│   └── setup.ts          # Test utilities: createTempImece(), cleanup()
├── core/
│   ├── imece.test.ts
│   ├── agent.test.ts
│   ├── messenger.test.ts
│   ├── taskboard.test.ts
│   ├── timeline.test.ts
│   └── locker.test.ts
├── cli/
│   └── commands.test.ts
└── utils/
    ├── fs.test.ts
    ├── id.test.ts
    ├── time.test.ts
    ├── path.test.ts
    └── validate.test.ts
```

### Test Patterns

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempImece, cleanup } from '../helpers/setup.js';

describe('AgentManager', () => {
  let tempDir: string;
  let imece: ImeceManager;

  beforeEach(async () => {
    tempDir = await createTempImece();
    imece = new ImeceManager(tempDir);
    await imece.init();
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  it('should register an agent', async () => {
    const agent = await imece.agents.register({
      name: 'test-agent',
      role: 'developer'
    });
    expect(agent.name).toBe('test-agent');
    expect(agent.status).toBe('online');
  });
});
```

## CLI Implementation

### Argument Parsing

```typescript
interface ParsedArgs {
  command: string;
  subcommand?: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  // Support: --key value and --key=value
  // Support: -k shorthand
}
```

### Command Routing

```typescript
const commands: Record<string, CommandHandler> = {
  init: handleInit,
  status: handleStatus,
  register: handleRegister,
  // ...
};

export async function run(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const handler = commands[args.command];
  if (!handler) {
    console.error(`Unknown command: ${args.command}`);
    process.exit(1);
  }
  await handler(args);
}
```

### UI Helpers

```typescript
// src/cli/ui.ts
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

export function box(title: string, content: string): string {
  // Unicode box drawing
}

export function table(headers: string[], rows: string[][]): string {
  // Calculate column widths and format
}
```

## SKILL.md Content Structure

The SKILL.md file teaches AI assistants how to use imece:

1. **Frontmatter** - YAML metadata for skill identification
2. **Quick Start** - Session start checklist
3. **Protocol Reference** - CLI commands table
4. **Behavioral Rules** - 10 rules for participation
5. **Workflow Patterns** - Common interaction patterns
6. **Delegation Pattern** - How to delegate tasks
7. **Conflict Prevention** - File locking protocol

## Implementation Order

1. **Phase 0**: SPECIFICATION.md, IMPLEMENTATION.md, TASKS.md
2. **Phase 1**: package.json, tsconfig, tsup, vitest configs, src/types.ts, all utils + tests
3. **Phase 2**: timeline, imece, agent, messenger, taskboard, locker + tests for each
4. **Phase 3**: src/index.ts exports
5. **Phase 4**: cli/ui.ts, cli/index.ts, all command files, src/bin.ts, CLI tests
6. **Phase 5**: skill/SKILL.md, templates/agent-prompt.hbs
7. **Phase 6**: llms.txt, README.md, examples
8. **Phase 7**: Full coverage run, build, e2e verification
