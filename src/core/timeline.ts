/**
 * Timeline - Append-only event log for imece
 * Every mutation emits a timeline event
 */

import { readJsonl, appendJsonl } from '../utils/fs.js';
import { now } from '../utils/time.js';
import type { TimelineEvent, TimelineEventType } from '../types.js';

export class Timeline {
  private readonly timelinePath: string;

  constructor(imeceDir: string) {
    this.timelinePath = `${imeceDir}/timeline.jsonl`;
  }

  /**
   * Append event to timeline
   * @param event - Event data (timestamp auto-added)
   * @example
   * await timeline.append({
   *   agent: 'ali',
   *   event: 'task:created',
   *   message: 'Created task: Review auth',
   *   data: { taskId: 'kx7f2' }
   * });
   */
  async append(event: Omit<TimelineEvent, 'timestamp'>): Promise<void> {
    const fullEvent: TimelineEvent = {
      timestamp: now(),
      ...event
    };
    await appendJsonl(this.timelinePath, fullEvent);
  }

  /**
   * Get recent events
   * @param limit - Maximum number of events (default: 50)
   * @returns Recent timeline events
   * @example
   * const recent = await timeline.recent(10);
   */
  async recent(limit = 50): Promise<TimelineEvent[]> {
    const events = await readJsonl<TimelineEvent>(this.timelinePath);
    return events.slice(-limit).reverse();
  }

  /**
   * Get all events
   * @returns All timeline events
   * @example
   * const all = await timeline.all();
   */
  async all(): Promise<TimelineEvent[]> {
    return readJsonl<TimelineEvent>(this.timelinePath);
  }

  /**
   * Filter events by type
   * @param eventType - Event type to filter by
   * @returns Events of specified type
   * @example
   * const taskEvents = await timeline.byType('task:created');
   */
  async byType(eventType: TimelineEventType): Promise<TimelineEvent[]> {
    const events = await this.all();
    return events.filter(e => e.event === eventType);
  }

  /**
   * Filter events by agent
   * @param agent - Agent name to filter by
   * @returns Events from specified agent
   * @example
   * const aliEvents = await timeline.byAgent('ali');
   */
  async byAgent(agent: string): Promise<TimelineEvent[]> {
    const events = await this.all();
    return events.filter(e => e.agent === agent);
  }

  /**
   * Search events by query string
   * Searches in message and stringified data
   * @param query - Search query
   * @returns Matching events
   * @example
   * const results = await timeline.search('authentication');
   */
  async search(query: string): Promise<TimelineEvent[]> {
    const lowerQuery = query.toLowerCase();
    const events = await this.all();
    return events.filter(e => {
      const inMessage = e.message.toLowerCase().includes(lowerQuery);
      const inData = e.data
        ? JSON.stringify(e.data).toLowerCase().includes(lowerQuery)
        : false;
      return inMessage || inData;
    });
  }

  /**
   * Get events in time range
   * @param from - Start timestamp (ISO 8601)
   * @param to - End timestamp (ISO 8601)
   * @returns Events in range
   * @example
   * const events = await timeline.range('2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z');
   */
  async range(from: string, to: string): Promise<TimelineEvent[]> {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const events = await this.all();
    return events.filter(e => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= fromMs && ts <= toMs;
    });
  }

  /**
   * Broadcast a message to all agents (creates timeline event)
   * @param agent - Agent broadcasting
   * @param message - Broadcast message
   * @param data - Optional structured data
   * @example
   * await timeline.broadcast('ali', 'Starting major refactor', { scope: 'api' });
   */
  async broadcast(
    agent: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.append({
      agent,
      event: 'broadcast',
      message,
      data
    });
  }
}
