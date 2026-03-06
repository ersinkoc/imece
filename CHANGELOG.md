# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-03-06

### Security
- **Path traversal prevention**: Added `validateFilePath()` to file locking — rejects paths escaping project root
- **Input length limits**: Message body/task description capped at 50K chars, subjects/titles at 500 chars
- **Improved error handling**: `readJson`/`readJsonl` now distinguish ENOENT from permission/disk errors instead of silently swallowing all exceptions

### Fixed
- **CRITICAL**: `require('fs')` in ESM module replaced with static `readFileSync` import (caused silent fallback in `getProjectName()`)
- **CRITICAL**: `handleReset` referenced module-level `args` instead of parameter — now takes `args: ParsedArgs` and only resets when `--confirm` is passed
- **CRITICAL**: `--version` flag reported hardcoded `1.0.0` instead of actual version — now uses `VERSION` constant
- **CRITICAL**: 278+ TypeScript compiler errors in CLI due to missing Node.js types — added `"types": ["node"]` to tsconfig
- **HIGH**: Unsafe `as` type casts of CLI user input (`--type`, `--priority`, `--status`) replaced with proper validation
- **HIGH**: `getThread()` could return duplicate messages — added ID-based deduplication
- **MEDIUM**: `generateId()` random suffix could be empty when `Math.random()` returns 0 — added `.padEnd(4, '0')`
- **MEDIUM**: `encodePath`/`decodePath` were not bijective (paths containing `__` decoded incorrectly) — switched to `_S_` encoding with escape mechanism

### Changed
- **Performance**: Sequential file reads in `list()`, `getInbox()`, `listLocks()`, `listByStatus()`, `all()`, `getProcessed()` parallelized with `Promise.all`
- **Code quality**: Duplicate `formatRelativeTime` in CLI replaced with re-export from shared `time.ts`
- **Code quality**: Unused imports (`moveFile`, `readDir`) removed from `messenger.ts`
- **Code quality**: All 15 CLI catch blocks use safe error message extraction
- **TypeScript**: Added `noFallthroughCasesInSwitch` to tsconfig.json
- Version constants synchronized to 1.0.4

### Stats
- Total tests: 365 (+15 from v1.0.3)
- Test coverage: 98.53% (statements), 97.06% (branches), 100% (functions)
- Zero vulnerabilities

## [1.0.3] - 2026-03-04

### Changed
- Version bump to 1.0.3 for maintenance release
- All version constants synchronized to 1.0.3

## [1.0.2] - 2026-03-04

### Fixed
- Windows path encoding bug in file locker (invalid filename with `:` character)
- IMECE_AGENT environment variable template in hooks (was hardcoded to 'kimibey')
- Circular dependency: removed `@oxog/imece` from devDependencies
- Version constants synchronized (1.0.2 across all files)

### Added
- Comprehensive edge case tests for locker (45 tests total, +25 new)
- Messenger edge case tests (43 tests total, +25 new)
- Agent manager edge case tests (47 tests total, +9 new)
- Additional test coverage for error handling paths

### Changed
- Improved hooks template to use dynamic agent names
- Enhanced error messages with platform-specific guidance
- Test coverage increased from 91.86% to 98.85% (350 tests)

### Stats
- Total tests: 350 (+151 from v1.0.0)
- Test coverage: 98.85%
- Functions coverage: 100%
- Zero vulnerabilities

## [1.0.1] - 2026-03-03

### Changed
- Scoped package name to `@oxog/imece` for npm availability
- Updated all CLI references from `npx imece` to `npx @oxog/imece`
- Moved documentation files to `docs/` directory
- CLI command remains `imece` when installed globally

## [1.0.0] - 2026-03-03

### Added
- Initial release of imece
- Universal multi-agent coordination system for AI code assistants
- File-based IPC with zero runtime dependencies
- TypeScript strict mode support with `exactOptionalPropertyTypes`

### Core Features
- **Agent Management**: Register agents with roles, capabilities, and model info
- **Messaging**: Inbox-based message passing between agents
- **Task Board**: Kanban-style task management (pending/active/done/blocked)
- **File Locking**: Advisory locks to prevent edit conflicts
- **Timeline**: Append-only event log for debugging and audit trails

### CLI Commands
- `init` - Initialize imece workspace
- `status` - Show swarm status
- `register` - Register a new agent
- `send` - Send messages between agents
- `task` - Create, claim, complete, and manage tasks
- `lock` / `unlock` - File locking
- `broadcast` - Broadcast messages to all agents
- `timeline` / `search` - View and search event history
- `prompt` - Generate agent system prompts
- `install-skill` - Install SKILL.md for AI assistants

### API
- `ImeceManager` - Main coordinator
- `AgentManager` - Agent lifecycle management
- `Messenger` - Message passing
- `TaskBoard` - Task management
- `FileLocker` - File locking
- `Timeline` - Event logging

### Documentation
- Comprehensive README with examples
- Specification document
- Implementation guide
- 6 usage examples (basic setup to debugging swarm)
- Skill file for AI assistants

### Testing
- 199 tests (179 unit + 20 E2E)
- 100% test coverage
- Cross-platform testing (Linux, Windows, macOS)
- Node.js 22+ support

[1.0.4]: https://github.com/ersinkoc/imece/releases/tag/v1.0.4
[1.0.3]: https://github.com/ersinkoc/imece/releases/tag/v1.0.3
[1.0.2]: https://github.com/ersinkoc/imece/releases/tag/v1.0.2
[1.0.1]: https://github.com/ersinkoc/imece/releases/tag/v1.0.1
[1.0.0]: https://github.com/ersinkoc/imece/releases/tag/v1.0.0
