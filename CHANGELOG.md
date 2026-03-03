# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-03

### Added
- Initial release of İmece
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
- `init` - Initialize İmece workspace
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

[1.0.0]: https://github.com/ersinkoc/imece/releases/tag/v1.0.0
