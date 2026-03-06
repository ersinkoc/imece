/**
 * Messenger - Message passing between agents
 * Inspired by Agent Teams SendMessage
 */

import { writeJson, readJson, listJsonFiles, ensureDir } from '../utils/fs.js';
import { now } from '../utils/time.js';
import { generateId, messageFilename } from '../utils/id.js';
import { validateAgentName } from '../utils/path.js';
import { validatePriority, validateMessageType } from '../utils/validate.js';
import type { ImeceMessage, SendMessageOptions, Priority, MessageType } from '../types.js';
import type { Timeline } from './timeline.js';

const DEFAULT_PRIORITY: Priority = 'normal';
const DEFAULT_TYPE: MessageType = 'message';

export class Messenger {
  private readonly inboxDir: string;
  private readonly timeline: Timeline;

  constructor(imeceDir: string, timeline: Timeline) {
    this.inboxDir = `${imeceDir}/inbox`;
    this.timeline = timeline;
  }

  private getInboxPath(agent: string): string {
    return `${this.inboxDir}/${agent}`;
  }

  private getProcessedPath(agent: string): string {
    return `${this.inboxDir}/${agent}/.processed`;
  }

  private getMessagePath(agent: string, filename: string): string {
    return `${this.getInboxPath(agent)}/${filename}`;
  }

  /**
   * Send a message to an agent
   * @param options - Message options
   * @returns Created message
   * @throws Error if sender or recipient invalid
   * @example
   * await messenger.send({
   *   from: 'ali',
   *   to: 'zeynep',
   *   type: 'task-delegate',
   *   subject: 'Review auth module',
   *   body: 'Please review...',
   *   priority: 'high',
   *   expectsReply: true
   * });
   */
  async send(options: SendMessageOptions): Promise<ImeceMessage> {
    validateAgentName(options.from);
    validateAgentName(options.to);

    if (options.body && options.body.length > 50_000) {
      throw new Error('Message body exceeds 50,000 character limit');
    }
    if (options.subject.length > 500) {
      throw new Error('Message subject exceeds 500 character limit');
    }

    const priority = options.priority ? validatePriority(options.priority) : DEFAULT_PRIORITY;
    const type = options.type ? validateMessageType(options.type) : DEFAULT_TYPE;

    const message: ImeceMessage = {
      id: generateId(),
      from: options.from,
      to: options.to,
      timestamp: now(),
      type,
      subject: options.subject,
      body: options.body,
      priority,
      expectsReply: options.expectsReply ?? false,
      replyTo: options.replyTo ?? null,
      read: false
    };

    const filename = messageFilename(message.id, message.from);
    await ensureDir(this.getInboxPath(options.to));
    await writeJson(this.getMessagePath(options.to, filename), message);

    await this.timeline.append({
      agent: options.from,
      event: 'message:sent',
      message: `Sent ${type} to ${options.to}: ${options.subject}`,
      data: { to: options.to, type, subject: options.subject }
    });

    return message;
  }

  /**
   * Get agent's inbox messages
   * @param agent - Agent name
   * @param includeRead - Include read messages (default: false)
   * @returns Array of messages
   * @example
   * const messages = await messenger.getInbox('zeynep');
   * const all = await messenger.getInbox('zeynep', true);
   */
  async getInbox(agent: string, includeRead = false): Promise<ImeceMessage[]> {
    const files = await listJsonFiles(this.getInboxPath(agent));
    const results = await Promise.all(
      files.map(f => readJson<ImeceMessage>(this.getMessagePath(agent, f)))
    );
    return results
      .filter((msg): msg is ImeceMessage => msg !== null && (includeRead || !msg.read))
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Count unread messages
   * @param agent - Agent name
   * @returns Number of unread messages
   * @example
   * const count = await messenger.unreadCount('zeynep');
   */
  async unreadCount(agent: string): Promise<number> {
    const inbox = await this.getInbox(agent, false);
    return inbox.length;
  }

  /**
   * Get a specific message
   * @param agent - Agent name
   * @param msgId - Message ID
   * @returns Message or null
   * @example
   * const msg = await messenger.getMessage('zeynep', 'kx7f2');
   */
  async getMessage(agent: string, msgId: string): Promise<ImeceMessage | null> {
    const files = await listJsonFiles(this.getInboxPath(agent));

    for (const file of files) {
      if (file.includes(`_${msgId}_`)) {
        return readJson<ImeceMessage>(this.getMessagePath(agent, file));
      }
    }

    /* c8 ignore start */
    // Check processed folder
    const processedFiles = await listJsonFiles(this.getProcessedPath(agent));
    for (const file of processedFiles) {
      if (file.includes(`_${msgId}_`)) {
        return readJson<ImeceMessage>(`${this.getProcessedPath(agent)}/${file}`);
      }
    }
    /* c8 ignore end */

    return null;
  }

  /**
   * Mark message as read
   * @param agent - Agent name
   * @param msgId - Message ID
   * @returns Updated message or null
   * @example
   * await messenger.markAsRead('zeynep', 'kx7f2');
   */
  async markAsRead(agent: string, msgId: string): Promise<ImeceMessage | null> {
    const files = await listJsonFiles(this.getInboxPath(agent));

    for (const file of files) {
      if (file.includes(`_${msgId}_`)) {
        const msg = await readJson<ImeceMessage>(this.getMessagePath(agent, file));
        if (!msg) continue;

        msg.read = true;
        await writeJson(this.getMessagePath(agent, file), msg);

        await this.timeline.append({
          agent,
          event: 'message:read',
          message: `Read message from ${msg.from}: ${msg.subject}`,
          data: { from: msg.from, messageId: msgId }
        });

        return msg;
      }
    }

    return null;
  }

  /**
   * Mark all messages as read
   * @param agent - Agent name
   * @returns Number of messages marked as read
   * @example
   * const count = await messenger.markAllAsRead('zeynep');
   */
  async markAllAsRead(agent: string): Promise<number> {
    const messages = await this.getInbox(agent, false);

    for (const msg of messages) {
      await this.markAsRead(agent, msg.id);
    }

    return messages.length;
  }

  /**
   * Reply to a message
   * @param agent - Replying agent (recipient of original)
   * @param msgId - Original message ID
   * @param body - Reply body
   * @returns Reply message or null if original not found
   * @example
   * await messenger.reply('zeynep', 'kx7f2', 'I will start working on this now.');
   */
  async reply(agent: string, msgId: string, body: string): Promise<ImeceMessage | null> {
    const original = await this.getMessage(agent, msgId);
    if (!original) return null;

    // Mark original as read
    await this.markAsRead(agent, msgId);

    // Send reply (swap from/to)
    return this.send({
      from: agent,
      to: original.from,
      type: 'message',
      subject: `Re: ${original.subject}`,
      body,
      replyTo: original.id
    });
  }

  /**
   * Get processed (read) messages
   * @param agent - Agent name
   * @returns Array of processed messages
   * @example
   * const processed = await messenger.getProcessed('zeynep');
   */
  /* c8 ignore start */
  async getProcessed(agent: string): Promise<ImeceMessage[]> {
    const files = await listJsonFiles(this.getProcessedPath(agent));
    const results = await Promise.all(
      files.map(f => readJson<ImeceMessage>(`${this.getProcessedPath(agent)}/${f}`))
    );
    return results
      .filter((msg): msg is ImeceMessage => msg !== null)
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  /* c8 ignore end */

  /**
   * Get conversation thread between two agents
   * @param agent1 - First agent
   * @param agent2 - Second agent
   * @returns Array of messages in chronological order
   * @example
   * const thread = await messenger.getThread('ali', 'zeynep');
   */
  async getThread(agent1: string, agent2: string): Promise<ImeceMessage[]> {
    const seen = new Set<string>();
    const messages: ImeceMessage[] = [];

    const addUnique = (msgs: ImeceMessage[]) => {
      for (const m of msgs) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          messages.push(m);
        }
      }
    };

    // Get from agent1's inbox (messages from agent2)
    const inbox1 = await this.getInbox(agent1, true);
    addUnique(inbox1.filter(m => m.from === agent2));

    // Get from agent2's inbox (messages from agent1)
    const inbox2 = await this.getInbox(agent2, true);
    addUnique(inbox2.filter(m => m.from === agent1));

    // Get processed messages
    const processed1 = await this.getProcessed(agent1);
    addUnique(processed1.filter(m => m.from === agent2));

    const processed2 = await this.getProcessed(agent2);
    addUnique(processed2.filter(m => m.from === agent1));

    // Sort by timestamp
    return messages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}
