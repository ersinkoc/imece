# Contributing to İmece

Thank you for your interest in contributing to İmece! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ersinkoc/imece.git
   cd imece
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build**
   ```bash
   npm run build
   ```

## Project Structure

```
imece/
├── src/
│   ├── types.ts          # TypeScript type definitions
│   ├── index.ts          # Public API exports
│   ├── bin.ts            # CLI entry point
│   ├── utils/            # Utility functions
│   │   ├── id.ts         # ID generation
│   │   ├── time.ts       # Time utilities
│   │   ├── path.ts       # Path encoding/decoding
│   │   ├── validate.ts   # Validation functions
│   │   └── fs.ts         # File system utilities
│   ├── core/             # Core modules
│   │   ├── imece.ts      # Main coordinator
│   │   ├── agent.ts      # Agent management
│   │   ├── messenger.ts  # Message passing
│   │   ├── taskboard.ts  # Task management
│   │   ├── timeline.ts   # Event logging
│   │   └── locker.ts     # File locking
│   └── cli/              # CLI implementation
│       ├── index.ts      # CLI commands
│       └── ui.ts         # UI helpers
├── tests/                # Test files
│   ├── helpers/          # Test helpers
│   ├── utils/            # Utils tests
│   ├── core/             # Core module tests
│   └── e2e/              # E2E tests
├── templates/            # Templates
├── skill/                # AI skill file
└── examples/             # Usage examples
```

## Code Style

- **TypeScript**: Strict mode enabled with `exactOptionalPropertyTypes`
- **ESM**: All modules use ES modules with `.js` extensions
- **Zero Dependencies**: Only Node.js built-in APIs
- **Formatting**: Follow existing code style

## Testing

All changes must include tests. We maintain 100% test coverage.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

Tests use Vitest and are organized alongside the source files:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-module.js';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### Test Guidelines

1. Test both success and error cases
2. Use descriptive test names
3. Test edge cases
4. Keep tests isolated (use `beforeEach`/`afterEach`)
5. Use test helpers in `tests/helpers/setup.ts`

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation if needed

3. **Run checks**
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

4. **Commit**
   ```bash
   git commit -m "feat: add new feature"
   ```

   Follow conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Test changes
   - `refactor:` Code refactoring
   - `chore:` Build/tooling changes

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear PR description
4. Link any related issues
5. Wait for review

## Key Principles

### Zero Dependencies

İmece has zero runtime dependencies. Only use Node.js built-in APIs.

### Atomic Writes

All file writes must be atomic:

```typescript
export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp.${generateId()}`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmpPath, filePath);
}
```

### Type Safety

All types must be explicit with no `any`:

```typescript
// Good
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Bad
function greet(name: any): any {
  return `Hello, ${name}`;
}
```

### File Organization

State is stored in `.imece/` directory:
- `agents/` - Agent profiles
- `inbox/` - Message queues
- `tasks/` - Kanban directories (pending/active/done/blocked)
- `locks/` - File locks
- `timeline.jsonl` - Event log

## Reporting Issues

When reporting issues, please include:

1. Node.js version (`node --version`)
2. Operating system
3. Steps to reproduce
4. Expected vs actual behavior
5. Error messages (if any)

## Questions?

Feel free to open an issue for questions or join discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
