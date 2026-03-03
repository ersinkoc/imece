import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup } from '../helpers/setup.js';

describe('Timeline', () => {
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

  describe('append', () => {
    it('should append event to timeline', async () => {
      const initialCount = (await imece.timeline.all()).length;

      await imece.timeline.append({
        agent: 'ali',
        event: 'task:created',
        message: 'Created task: Test task',
        data: { taskId: 'abc123' }
      });

      const events = await imece.timeline.all();
      expect(events).toHaveLength(initialCount + 1);
      const lastEvent = events[events.length - 1];
      expect(lastEvent?.agent).toBe('ali');
      expect(lastEvent?.event).toBe('task:created');
      expect(lastEvent?.timestamp).toBeDefined();
    });

    it('should append multiple events', async () => {
      const initialCount = (await imece.timeline.all()).length;

      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'First' });
      await imece.timeline.append({ agent: 'zeynep', event: 'broadcast', message: 'Second' });

      const events = await imece.timeline.all();
      expect(events).toHaveLength(initialCount + 2);
    });
  });

  describe('recent', () => {
    it('should return recent events with limit', async () => {
      for (let i = 0; i < 10; i++) {
        await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: `Event ${i}` });
      }

      const recent = await imece.timeline.recent(5);
      expect(recent).toHaveLength(5);
      // Most recent first
      expect(recent[0]?.message).toBe('Event 9');
    });

    it('should return all events if fewer than limit', async () => {
      const initialCount = (await imece.timeline.all()).length;
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Event 1' });

      const recent = await imece.timeline.recent(initialCount + 10);
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('all', () => {
    it('should return all events in order', async () => {
      const initialCount = (await imece.timeline.all()).length;
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'First' });
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Second' });

      const events = await imece.timeline.all();
      // Check the last two events we just added
      expect(events[initialCount]?.message).toBe('First');
      expect(events[initialCount + 1]?.message).toBe('Second');
    });
  });

  describe('byType', () => {
    it('should filter by event type', async () => {
      await imece.timeline.append({ agent: 'ali', event: 'task:created', message: 'Task' });
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Broadcast' });
      await imece.timeline.append({ agent: 'ali', event: 'task:completed', message: 'Completed' });

      const tasks = await imece.timeline.byType('task:created');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.message).toBe('Task');
    });
  });

  describe('byAgent', () => {
    it('should filter by agent', async () => {
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'From Ali' });
      await imece.timeline.append({ agent: 'zeynep', event: 'broadcast', message: 'From Zeynep' });

      const aliEvents = await imece.timeline.byAgent('ali');
      expect(aliEvents).toHaveLength(1);
      expect(aliEvents[0]?.message).toBe('From Ali');
    });
  });

  describe('search', () => {
    it('should search in message', async () => {
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Authentication module ready' });
      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Dashboard updated' });

      const results = await imece.timeline.search('authentication');
      expect(results).toHaveLength(1);
      expect(results[0]?.message).toContain('Authentication');
    });

    it('should search in data', async () => {
      await imece.timeline.append({
        agent: 'ali',
        event: 'task:created',
        message: 'Task created',
        data: { component: 'UserProfile' }
      });

      const results = await imece.timeline.search('UserProfile');
      expect(results).toHaveLength(1);
    });
  });

  describe('range', () => {
    it('should return events in time range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await imece.timeline.append({ agent: 'ali', event: 'broadcast', message: 'Test' });

      const events = await imece.timeline.range(yesterday.toISOString(), tomorrow.toISOString());
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('broadcast', () => {
    it('should create broadcast event', async () => {
      const initialCount = (await imece.timeline.all()).length;

      await imece.timeline.broadcast('ali', 'Project starting!', { phase: 'kickoff' });

      const events = await imece.timeline.all();
      expect(events).toHaveLength(initialCount + 1);
      const lastEvent = events[events.length - 1];
      expect(lastEvent?.event).toBe('broadcast');
      expect(lastEvent?.agent).toBe('ali');
      expect(lastEvent?.message).toBe('Project starting!');
      expect(lastEvent?.data).toEqual({ phase: 'kickoff' });
    });
  });
});
