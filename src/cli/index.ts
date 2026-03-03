/**
 * CLI entry point and argument parser
 */

import { ImeceManager } from '../core/imece.js';
import { colors, icons, box, table, formatStatus, formatPriority, formatRelativeTime, success, error, info } from './ui.js';
import type { AgentProfile, ImeceMessage, ImeceTask, TimelineEvent } from '../types.js';

interface ParsedArgs {
  command: string;
  subcommand?: string | undefined;
  args: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Parse command line arguments
 * Supports: --key value, --key=value, -k value, -k
 */
function parseArgs(argv: string[]): ParsedArgs {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex > -1) {
        // --key=value
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (key) flags[key] = value;
      } else if (i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('-')) {
        // --key value
        const key = arg.slice(2);
        const value = argv[++i]!;
        if (key) flags[key] = value;
      } else {
        // --flag
        const key = arg.slice(2);
        if (key) flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      if (i + 1 < argv.length && argv[i + 1] && !argv[i + 1]!.startsWith('-')) {
        // -k value
        const key = arg.slice(1);
        const value = argv[++i]!;
        if (key) flags[key] = value;
      } else {
        // -k
        const key = arg.slice(1);
        if (key) flags[key] = true;
      }
    } else {
      args.push(arg);
    }
  }

  const command = args.shift() ?? '';
  let subcommand: string | undefined = undefined;

  // Handle multi-word commands like "task create"
  if (['task'].includes(command) && args.length > 0) {
    subcommand = args.shift();
  }

  return { command, subcommand, args, flags };
}

/**
 * Show help text
 */
function showHelp(): void {
  console.log(`
${colors.bold}${colors.cyan}İmece${colors.reset} - Universal Multi-Agent Coordination

${colors.bold}Usage:${colors.reset} imece <command> [options]

${colors.bold}Core Commands:${colors.reset}
  init [--desc <text>]              Initialize imece workspace
  status                            Show swarm status
  reset                             Reset workspace (destructive)

${colors.bold}Agent Commands:${colors.reset}
  register <name> <role> [opts]     Register a new agent
                                    --caps <c1,c2>  Capabilities
                                    --model <m>     AI model
                                    --lead          Set as team lead
  whoami <name>                     Show agent profile
  agents                            List all agents
  heartbeat <name>                  Update agent heartbeat
  offline <name>                    Mark agent offline

${colors.bold}Message Commands:${colors.reset}
  send <from> <to> <subject>        Send a message
         [--body <text>] [--type <t>] [--priority <p>]
  inbox <agent> [--all]             Check inbox
  read <agent> <msg-id>             Mark message as read
  reply <agent> <msg-id> <body>     Reply to message
  thread <a1> <a2>                  Show conversation thread

${colors.bold}Task Commands:${colors.reset}
  task create <from> <to> <title>   Create a task
              [--desc <text>] [--criteria <c1,c2>]
              [--priority <p>] [--tags <t1,t2>]
  task list [--status <s>] [--agent <n>]  List tasks
  task show <id>                    Show task details
  task claim <id> <agent>           Claim a task
  task complete <id> [--note <n>]   Complete a task
  task delegate <f> <t> <title>     Delegate via message
  task block <id> <reason>          Block a task
  task unblock <id>                 Unblock a task
  task note <id> <agent> <text>     Add note to task

${colors.bold}Timeline Commands:${colors.reset}
  broadcast <agent> <message>       Broadcast a message
  timeline [--limit <n>] [--agent]  Show recent events
  search <query>                    Search timeline

${colors.bold}Lock Commands:${colors.reset}
  lock <agent> <filepath>           Lock a file
  unlock <agent> <filepath>         Unlock a file
  locks                             List active locks

${colors.bold}Skill Commands:${colors.reset}
  install-skill [--dir <path>]      Install SKILL.md
  prompt <name> <role> [opts]       Generate agent prompt
                                    --caps <c1,c2>  Capabilities
                                    --model <m>     AI model

${colors.bold}Examples:${colors.reset}
  imece init --desc "My project swarm"
  imece register ali lead-architect --caps "arch,api" --lead
  imece send ali zeynep "Review PR" --body "Please review..."
  imece task create ali zeynep "Fix bug" --priority high
  imece lock ali src/api/users.ts
`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleInit(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const desc = args.flags.desc as string | undefined;

  try {
    await imece.init(desc);
    success('İmece initialized successfully');
    console.log(`  Project: ${colors.cyan}${await imece.getConfig().then(c => c?.project)}${colors.reset}`);
    console.log(`  Directory: ${colors.gray}.imece/${colors.reset}`);
    if (desc) {
      console.log(`  Description: ${desc}`);
    }
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleStatus(): Promise<void> {
  const imece = new ImeceManager();

  if (!(await imece.isInitialized())) {
    error('İmece is not initialized. Run: imece init');
    process.exit(1);
  }

  const status = await imece.getStatus({ timelineLimit: 5 });
  if (!status) {
    error('Failed to get status');
    process.exit(1);
  }

  // Header box
  console.log(box(
    `🤝 İMECE STATUS`,
    `Project: ${status.config.project}\n` +
    `Created: ${new Date(status.config.created).toLocaleDateString()}`
  ));
  console.log();

  // Agents table
  const onlineCount = status.agents.filter(a => a.status !== 'offline').length;
  console.log(`${colors.bold}👥 AGENTS${colors.reset} (${onlineCount} online, ${status.agents.length - onlineCount} offline)`);

  if (status.agents.length > 0) {
    const agentRows = await Promise.all(status.agents.map(async a => {
      const unread = await imece.messages.unreadCount(a.name);
      const statusIcon = a.isLead ? `${icons.lead} ` : '';
      return [
        `${statusIcon}${a.name}`,
        a.role,
        formatStatus(a.status),
        a.currentTask ? a.currentTask.substring(0, 20) : '',
        a.status === 'offline' ? '-' : `${unread}`
      ];
    }));

    console.log(table(
      ['Name', 'Role', 'Status', 'Current Task', '📬'],
      agentRows
    ));
  } else {
    console.log('\x1b[90m  No agents registered\x1b[0m');
  }
  console.log();

  // Tasks summary
  console.log(`${colors.bold}📋 TASKS${colors.reset}`);
  console.log(`  Backlog: ${status.taskSummary.backlog}  │  Active: ${colors.yellow}${status.taskSummary.active}${colors.reset}  │  Done: ${colors.green}${status.taskSummary.done}${colors.reset}  │  Blocked: ${colors.red}${status.taskSummary.blocked}${colors.reset}`);

  if (status.activeTasks.length > 0) {
    console.log(`\n  ${icons.active} Active:`);
    for (const task of status.activeTasks.slice(0, 5)) {
      console.log(`    #${task.id.substring(0, 6)} → ${task.assignedTo}: "${task.title.substring(0, 40)}"`);
    }
  }
  console.log();

  // Locks
  if (status.activeLocks.length > 0) {
    console.log(`${colors.bold}🔒 LOCKS${colors.reset} (${status.activeLocks.length} active)`);
    for (const lock of status.activeLocks.slice(0, 5)) {
      console.log(`  ${lock.file} → ${lock.agent} (${formatRelativeTime(lock.lockedAt)})`);
    }
    console.log();
  }

  // Recent timeline
  if (status.recentTimeline.length > 0) {
    console.log(`${colors.bold}📢 RECENT TIMELINE${colors.reset}`);
    for (const event of status.recentTimeline) {
      const icon = event.event.includes('task') ? icons.task :
                   event.event.includes('message') ? icons.message :
                   event.event === 'broadcast' ? icons.broadcast :
                   icons.bullet;
      console.log(`  ${icon} [${colors.gray}${event.agent}${colors.reset}] ${event.message} (${formatRelativeTime(event.timestamp)})`);
    }
  }
}

async function handleReset(): Promise<void> {
  const imece = new ImeceManager();

  if (!(await imece.isInitialized())) {
    error('İmece is not initialized');
    process.exit(1);
  }

  console.log(`${colors.red}⚠ WARNING: This will delete all imece data!${colors.reset}`);
  console.log('To confirm, run: imece reset --confirm');

  if (args.flags.confirm) {
    await imece.reset();
    success('İmece has been reset');
  }
}

async function handleRegister(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();

  if (!(await imece.isInitialized())) {
    error('İmece is not initialized. Run: imece init');
    process.exit(1);
  }

  const [name, role] = args.args;
  if (!name || !role) {
    error('Usage: imece register <name> <role> [--caps <c1,c2>] [--model <m>] [--lead]');
    process.exit(1);
  }

  const caps = (args.flags.caps as string | undefined)?.split(',').map(c => c.trim()) ?? [];
  const model = (args.flags.model as string | undefined) ?? 'unknown';
  const isLead = args.flags.lead === true;

  try {
    const agent = await imece.agents.register({
      name,
      role,
      capabilities: caps,
      model,
      isLead
    });

    success(`Agent ${colors.cyan}${agent.name}${colors.reset} registered as ${colors.yellow}${agent.role}${colors.reset}`);
    if (isLead) {
      info('Set as team lead 👑');
    }
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleWhoami(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [name] = args.args;

  if (!name) {
    error('Usage: imece whoami <name>');
    process.exit(1);
  }

  const agent = await imece.agents.get(name);
  if (!agent) {
    error(`Agent '${name}' not found`);
    process.exit(1);
  }

  console.log(box(
    `${agent.isLead ? icons.lead + ' ' : ''}${agent.name}`,
    `Role: ${agent.role}\n` +
    `Status: ${formatStatus(agent.status)}\n` +
    `Model: ${agent.model}\n` +
    `Capabilities: ${agent.capabilities.join(', ') || 'none'}\n` +
    `Last Seen: ${formatRelativeTime(agent.lastSeen)}\n` +
    `Current Task: ${agent.currentTask || 'none'}\n` +
    `Files: ${agent.filesWorkingOn.join(', ') || 'none'}`
  ));
}

async function handleAgents(): Promise<void> {
  const imece = new ImeceManager();
  const agents = await imece.agents.list();

  if (agents.length === 0) {
    info('No agents registered');
    return;
  }

  const rows = await Promise.all(agents.map(async a => {
    const unread = await imece.messages.unreadCount(a.name);
    return [
      a.isLead ? `${icons.lead} ${a.name}` : a.name,
      a.role,
      formatStatus(a.status),
      formatRelativeTime(a.lastSeen),
      unread > 0 ? `${colors.yellow}${unread}${colors.reset}` : '0'
    ];
  }));

  console.log(table(
    ['Name', 'Role', 'Status', 'Last Seen', '📬'],
    rows
  ));
}

async function handleHeartbeat(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [name] = args.args;

  if (!name) {
    error('Usage: imece heartbeat <name>');
    process.exit(1);
  }

  const agent = await imece.agents.heartbeat(name);
  if (!agent) {
    error(`Agent '${name}' not found`);
    process.exit(1);
  }

  success(`Heartbeat updated for ${name}`);
}

async function handleOffline(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [name] = args.args;

  if (!name) {
    error('Usage: imece offline <name>');
    process.exit(1);
  }

  const agent = await imece.agents.goOffline(name);
  if (!agent) {
    error(`Agent '${name}' not found`);
    process.exit(1);
  }

  success(`${name} is now offline`);
}

async function handleSend(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [from, to, subject] = args.args;

  if (!from || !to || !subject) {
    error('Usage: imece send <from> <to> <subject> [--body <text>] [--type <type>] [--priority <p>]');
    process.exit(1);
  }

  try {
    const msg = await imece.messages.send({
      from,
      to,
      subject,
      body: (args.flags.body as string | undefined) ?? '',
      type: (args.flags.type as import('../types.js').MessageType | undefined) ?? 'message',
      priority: (args.flags.priority as import('../types.js').Priority | undefined) ?? 'normal'
    });

    success(`Message sent to ${to} (${msg.id})`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleInbox(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent] = args.args;

  if (!agent) {
    error('Usage: imece inbox <agent> [--all]');
    process.exit(1);
  }

  const includeRead = args.flags.all === true;
  const messages = await imece.messages.getInbox(agent, includeRead);

  if (messages.length === 0) {
    info(includeRead ? 'No messages' : 'No unread messages');
    return;
  }

  console.log(`${colors.bold}📬 Inbox for ${agent}${colors.reset} (${messages.filter(m => !m.read).length} unread)`);
  console.log();

  for (const msg of messages) {
    const icon = msg.read ? icons.inboxEmpty : icons.inboxNew;
    const priority = msg.priority === 'urgent' ? `${icons.urgent} URGENT ` :
                     msg.priority === 'high' ? 'HIGH ' : '';
    console.log(`${icon} ${colors.gray}#${msg.id.substring(0, 6)}${colors.reset} ${priority}From: ${msg.from}`);
    console.log(`   Subject: ${msg.subject}`);
    if (msg.body) {
      const bodyPreview = msg.body.length > 60 ? msg.body.substring(0, 60) + '...' : msg.body;
      console.log(`   ${colors.gray}${bodyPreview}${colors.reset}`);
    }
    console.log();
  }
}

async function handleRead(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent, msgId] = args.args;

  if (!agent || !msgId) {
    error('Usage: imece read <agent> <msg-id>');
    process.exit(1);
  }

  const msg = await imece.messages.markAsRead(agent, msgId);
  if (!msg) {
    error('Message not found');
    process.exit(1);
  }

  success(`Marked as read: ${msg.subject}`);
}

async function handleReply(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent, msgId, ...bodyParts] = args.args;
  const body = bodyParts.join(' ');

  if (!agent || !msgId || !body) {
    error('Usage: imece reply <agent> <msg-id> <body>');
    process.exit(1);
  }

  const reply = await imece.messages.reply(agent, msgId, body);
  if (!reply) {
    error('Original message not found');
    process.exit(1);
  }

  success(`Reply sent (${reply.id})`);
}

async function handleTaskCreate(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [from, to, ...titleParts] = args.args;
  const title = titleParts.join(' ');

  if (!from || !to || !title) {
    error('Usage: imece task create <from> <to> <title> [--desc <text>] [--criteria <c1,c2>] [--priority <p>] [--tags <t1,t2>]');
    process.exit(1);
  }

  try {
    const criteria = (args.flags.criteria as string | undefined)?.split(',').map(c => c.trim());
    const tags = (args.flags.tags as string | undefined)?.split(',').map(t => t.trim());

    const task = await imece.tasks.create({
      createdBy: from,
      assignedTo: to,
      title,
      description: (args.flags.desc as string | undefined) ?? '',
      acceptanceCriteria: criteria,
      priority: (args.flags.priority as import('../types.js').Priority | undefined) ?? 'normal',
      tags
    });

    success(`Task created: ${task.id}`);
    info(`Assigned to: ${to}`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleTaskList(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const status = args.flags.status as string | undefined;
  const agent = args.flags.agent as string | undefined;

  let tasks: ImeceTask[];
  if (status) {
    tasks = await imece.tasks.listByStatus(status as import('../types.js').TaskStatus);
  } else if (agent) {
    tasks = await imece.tasks.getAgentTasks(agent);
  } else {
    tasks = await imece.tasks.all();
  }

  if (tasks.length === 0) {
    info('No tasks found');
    return;
  }

  console.log(table(
    ['ID', 'Title', 'Status', 'Assignee', 'Priority'],
    tasks.map(t => [
      t.id.substring(0, 8),
      t.title.substring(0, 30),
      t.status,
      t.assignedTo,
      formatPriority(t.priority)
    ])
  ));
}

async function handleTaskShow(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId] = args.args;

  if (!taskId) {
    error('Usage: imece task show <task-id>');
    process.exit(1);
  }

  const task = await imece.tasks.find(taskId);
  if (!task) {
    error('Task not found');
    process.exit(1);
  }

  console.log(box(
    `${task.status === 'done' ? icons.done : task.status === 'active' ? icons.active : task.status === 'blocked' ? icons.blocked : icons.task} ${task.title}`,
    `ID: ${task.id}\n` +
    `Status: ${task.status}\n` +
    `Priority: ${formatPriority(task.priority)}\n` +
    `Created by: ${task.createdBy}\n` +
    `Assigned to: ${task.assignedTo}\n` +
    `\nDescription:\n${task.description || '(none)'}\n` +
    (task.acceptanceCriteria.length > 0 ? `\nAcceptance Criteria:\n${task.acceptanceCriteria.map(c => `  • ${c}`).join('\n')}` : '') +
    (task.notes.length > 0 ? `\n\nNotes:\n${task.notes.map(n => `  [${n.agent}] ${n.text}`).join('\n')}` : '')
  ));
}

async function handleTaskClaim(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId, agent] = args.args;

  if (!taskId || !agent) {
    error('Usage: imece task claim <task-id> <agent>');
    process.exit(1);
  }

  try {
    await imece.tasks.claim(taskId, agent);
    success(`Task ${taskId} claimed by ${agent}`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleTaskComplete(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId] = args.args;
  const note = args.flags.note as string | undefined;

  if (!taskId) {
    error('Usage: imece task complete <task-id> [--note <text>]');
    process.exit(1);
  }

  try {
    await imece.tasks.complete(taskId, note);
    success(`Task ${taskId} completed`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleTaskBlock(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId, ...reasonParts] = args.args;
  const reason = reasonParts.join(' ');

  if (!taskId || !reason) {
    error('Usage: imece task block <task-id> <reason>');
    process.exit(1);
  }

  try {
    await imece.tasks.block(taskId, reason);
    success(`Task ${taskId} blocked`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleTaskUnblock(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId] = args.args;

  if (!taskId) {
    error('Usage: imece task unblock <task-id>');
    process.exit(1);
  }

  try {
    await imece.tasks.unblock(taskId);
    success(`Task ${taskId} unblocked`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleBroadcast(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent, ...messageParts] = args.args;
  const message = messageParts.join(' ');

  if (!agent || !message) {
    error('Usage: imece broadcast <agent> <message>');
    process.exit(1);
  }

  await imece.timeline.broadcast(agent, message);
  success(`Broadcast: ${message}`);
}

async function handleTimeline(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const limit = parseInt(args.flags.limit as string | undefined ?? '20', 10);
  const agent = args.flags.agent as string | undefined;

  let events: TimelineEvent[];
  if (agent) {
    events = await imece.timeline.byAgent(agent);
  } else {
    events = await imece.timeline.recent(limit);
  }

  if (events.length === 0) {
    info('No timeline events');
    return;
  }

  for (const event of events) {
    const icon = event.event.includes('task') ? icons.task :
                 event.event.includes('message') ? icons.message :
                 event.event === 'broadcast' ? icons.broadcast :
                 icons.bullet;
    console.log(`${icon} [${colors.gray}${event.timestamp.substring(0, 19)}${colors.reset}] ${event.agent}: ${event.message}`);
  }
}

async function handleLocks(): Promise<void> {
  const imece = new ImeceManager();
  const locks = await imece.locks.listLocks();

  if (locks.length === 0) {
    info('No active locks');
    return;
  }

  console.log(table(
    ['File', 'Agent', 'Locked At', 'Reason'],
    locks.map(l => [
      l.file,
      l.agent,
      formatRelativeTime(l.lockedAt),
      l.reason || '-'
    ])
  ));
}

async function handleLock(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent, filepath] = args.args;

  if (!agent || !filepath) {
    error('Usage: imece lock <agent> <filepath>');
    process.exit(1);
  }

  try {
    await imece.locks.lock(agent, filepath);
    success(`Locked: ${filepath}`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handleUnlock(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent, filepath] = args.args;

  if (!agent || !filepath) {
    error('Usage: imece unlock <agent> <filepath>');
    process.exit(1);
  }

  try {
    await imece.locks.unlock(agent, filepath);
    success(`Unlocked: ${filepath}`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

async function handlePrompt(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [name, role] = args.args;

  if (!name || !role) {
    error('Usage: imece prompt <name> <role> [--caps <c1,c2>] [--model <m>]');
    process.exit(1);
  }

  const caps = (args.flags.caps as string | undefined)?.split(',').map(c => c.trim());
  const model = args.flags.model as string | undefined;

  const options: { capabilities?: string[]; model?: string; isLead?: boolean } = {};
  if (caps) options.capabilities = caps;
  if (model) options.model = model;

  const prompt = imece.generatePrompt(name, role, options);

  console.log(prompt);
}

async function handleInstallSkill(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const dir = args.flags.dir as string | undefined;

  const dest = await imece.installSkill(dir);
  success(`Skill file installed to: ${dest}`);
}

async function handleSearch(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [query] = args.args;

  if (!query) {
    error('Usage: imece search <query>');
    process.exit(1);
  }

  const results = await imece.timeline.search(query);

  if (results.length === 0) {
    info('No results found');
    return;
  }

  for (const event of results) {
    console.log(`[${colors.gray}${event.timestamp.substring(0, 19)}${colors.reset}] ${event.agent}: ${event.message}`);
  }
}

async function handleThread(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [agent1, agent2] = args.args;

  if (!agent1 || !agent2) {
    error('Usage: imece thread <agent1> <agent2>');
    process.exit(1);
  }

  const messages = await imece.messages.getThread(agent1, agent2);

  if (messages.length === 0) {
    info('No messages between these agents');
    return;
  }

  console.log(`${colors.bold}Conversation: ${agent1} ↔ ${agent2}${colors.reset}\n`);

  for (const msg of messages) {
    const fromMe = msg.from === agent1;
    const prefix = fromMe ? `${colors.cyan}${msg.from}${colors.reset}` : `${colors.yellow}${msg.from}${colors.reset}`;
    console.log(`${prefix}: ${msg.subject}`);
    if (msg.body) {
      console.log(`  ${colors.gray}${msg.body}${colors.reset}`);
    }
    console.log();
  }
}

async function handleTaskNote(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [taskId, agent, ...textParts] = args.args;
  const text = textParts.join(' ');

  if (!taskId || !agent || !text) {
    error('Usage: imece task note <task-id> <agent> <text>');
    process.exit(1);
  }

  const task = await imece.tasks.addNote(taskId, agent, text);
  if (!task) {
    error('Task not found');
    process.exit(1);
  }

  success('Note added');
}

async function handleTaskDelegate(args: ParsedArgs): Promise<void> {
  const imece = new ImeceManager();
  const [from, to, ...titleParts] = args.args;
  const title = titleParts.join(' ');

  if (!from || !to || !title) {
    error('Usage: imece task delegate <from> <to> <title> [--desc <text>] [--criteria <c1,c2>]');
    process.exit(1);
  }

  try {
    const criteria = (args.flags.criteria as string | undefined)?.split(',').map(c => c.trim());

    const task = await imece.tasks.create({
      createdBy: from,
      assignedTo: to,
      title,
      description: (args.flags.desc as string | undefined) ?? '',
      acceptanceCriteria: criteria,
      priority: 'normal'
    });

    await imece.tasks.delegate(task, imece.messages);
    success(`Task delegated: ${task.id}`);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const args = parseArgs(process.argv.slice(2));

// Handle help
if (!args.command || args.command === 'help' || args.flags.help || args.flags.h) {
  showHelp();
  process.exit(0);
}

// Handle version
if (args.flags.version || args.flags.v) {
  console.log('1.0.0');
  process.exit(0);
}

// Command routing
const commands: Record<string, () => Promise<void>> = {
  init: () => handleInit(args),
  status: () => handleStatus(),
  reset: () => handleReset(),
  register: () => handleRegister(args),
  whoami: () => handleWhoami(args),
  agents: () => handleAgents(),
  heartbeat: () => handleHeartbeat(args),
  offline: () => handleOffline(args),
  send: () => handleSend(args),
  inbox: () => handleInbox(args),
  read: () => handleRead(args),
  reply: () => handleReply(args),
  broadcast: () => handleBroadcast(args),
  timeline: () => handleTimeline(args),
  search: () => handleSearch(args),
  locks: () => handleLocks(),
  lock: () => handleLock(args),
  unlock: () => handleUnlock(args),
  prompt: () => handlePrompt(args),
  'install-skill': () => handleInstallSkill(args),
  thread: () => handleThread(args),
};

// Handle task subcommands
if (args.command === 'task' && args.subcommand) {
  const taskCommands: Record<string, () => Promise<void>> = {
    create: () => handleTaskCreate(args),
    list: () => handleTaskList(args),
    show: () => handleTaskShow(args),
    claim: () => handleTaskClaim(args),
    complete: () => handleTaskComplete(args),
    block: () => handleTaskBlock(args),
    unblock: () => handleTaskUnblock(args),
    note: () => handleTaskNote(args),
    delegate: () => handleTaskDelegate(args),
  };

  const handler = taskCommands[args.subcommand];
  if (handler) {
    handler().catch(e => {
      error((e as Error).message);
      process.exit(1);
    });
  } else {
    error(`Unknown task subcommand: ${args.subcommand}`);
    process.exit(1);
  }
} else {
  const handler = commands[args.command];
  if (handler) {
    handler().catch(e => {
      error((e as Error).message);
      process.exit(1);
    });
  } else {
    error(`Unknown command: ${args.command}`);
    console.log('Run `imece help` for usage');
    process.exit(1);
  }
}
