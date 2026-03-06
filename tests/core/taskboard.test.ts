import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup } from '../helpers/setup.js';

describe('TaskBoard', () => {
  let tempDir: string;
  let imece: ImeceManager;

  beforeEach(async () => {
    tempDir = await createTempImece();
    imece = new ImeceManager(tempDir);
    await imece.init();

    await imece.agents.register({ name: 'ali', role: 'dev' });
    await imece.agents.register({ name: 'zeynep', role: 'dev' });
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Build feature',
        description: 'Implement the feature',
        priority: 'high',
        tags: ['feature', 'v1']
      });

      expect(task.title).toBe('Build feature');
      expect(task.description).toBe('Implement the feature');
      expect(task.createdBy).toBe('ali');
      expect(task.assignedTo).toBe('zeynep');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('pending');
      expect(task.tags).toEqual(['feature', 'v1']);
      expect(task.id).toBeDefined();
    });

    it('should default to normal priority', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      expect(task.priority).toBe('normal');
    });

    it('should default to empty arrays', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      expect(task.acceptanceCriteria).toEqual([]);
      expect(task.blockedBy).toEqual([]);
      expect(task.tags).toEqual([]);
      expect(task.notes).toEqual([]);
    });
  });

  describe('claim', () => {
    it('should claim a pending task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test task'
      });

      const claimed = await imece.tasks.claim(task.id, 'zeynep');

      expect(claimed?.status).toBe('active');
      expect(claimed?.startedAt).toBeDefined();
    });

    it('should update assignedTo', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'ali', // Initially assigned to creator
        title: 'Test task'
      });

      const claimed = await imece.tasks.claim(task.id, 'zeynep');
      expect(claimed?.assignedTo).toBe('zeynep');
    });

    it('should return null if task not found', async () => {
      const result = await imece.tasks.claim('nonexistent', 'zeynep');
      expect(result).toBeNull();
    });

    it('should throw if already active', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await expect(
        imece.tasks.claim(task.id, 'ali')
      ).rejects.toThrow('already claimed');
    });

    it('should throw if already completed', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.complete(task.id);

      await expect(
        imece.tasks.claim(task.id, 'zeynep')
      ).rejects.toThrow('already completed');
    });

    it('should throw if blocked by dependencies', async () => {
      const dep = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Dependency'
      });

      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        blockedBy: [dep.id]
      });

      await expect(
        imece.tasks.claim(task.id, 'zeynep')
      ).rejects.toThrow('blocked by dependencies');
    });
  });

  describe('complete', () => {
    it('should complete an active task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      const completed = await imece.tasks.complete(task.id, 'All done!');

      expect(completed?.status).toBe('done');
      expect(completed?.completedAt).toBeDefined();
    });

    it('should add completion note', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      const completed = await imece.tasks.complete(task.id, 'Note text');

      const note = completed?.notes.find(n => n.text === 'Note text');
      expect(note).toBeDefined();
      expect(note?.agent).toBe('zeynep');
    });

    it('should throw if already completed', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.complete(task.id);

      await expect(
        imece.tasks.complete(task.id)
      ).rejects.toThrow('already completed');
    });
  });

  describe('block and unblock', () => {
    it('should block a task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      const blocked = await imece.tasks.block(task.id, 'Waiting for API');

      expect(blocked?.status).toBe('blocked');
      const note = blocked?.notes.find(n => n.text.includes('BLOCKED'));
      expect(note).toBeDefined();
    });

    it('should unblock a task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.block(task.id, 'Waiting');
      const unblocked = await imece.tasks.unblock(task.id);

      expect(unblocked?.status).toBe('pending');
    });

    it('should throw if trying to block completed task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.complete(task.id);

      await expect(
        imece.tasks.block(task.id, 'Cannot block')
      ).rejects.toThrow('Cannot block completed');
    });

    it('should throw if task already blocked', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.block(task.id, 'Waiting');

      await expect(
        imece.tasks.block(task.id, 'Already blocked')
      ).rejects.toThrow('already blocked');
    });

    it('should throw if not blocked when unblocking', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await expect(
        imece.tasks.unblock(task.id)
      ).rejects.toThrow('not blocked');
    });

    it('should return null for non-existent task', async () => {
      const result = await imece.tasks.unblock('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('addNote', () => {
    it('should add note to task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      const updated = await imece.tasks.addNote(task.id, 'zeynep', 'Progress update');
      expect(updated?.notes).toHaveLength(1);
      expect(updated?.notes[0]?.text).toBe('Progress update');
      expect(updated?.notes[0]?.agent).toBe('zeynep');
    });

    it('should return null for non-existent task', async () => {
      const updated = await imece.tasks.addNote('nonexistent', 'zeynep', 'Note');
      expect(updated).toBeNull();
    });
  });

  describe('find', () => {
    it('should find task by ID', async () => {
      const created = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      const found = await imece.tasks.find(created.id);
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test');
    });

    it('should return null for non-existent task', async () => {
      const found = await imece.tasks.find('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('listByStatus', () => {
    it('should list tasks by status', async () => {
      const task1 = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Pending task'
      });

      const task2 = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Active task'
      });
      await imece.tasks.claim(task2.id, 'zeynep');

      const pending = await imece.tasks.listByStatus('pending');
      const active = await imece.tasks.listByStatus('active');

      expect(pending.some(t => t.id === task1.id)).toBe(true);
      expect(active.some(t => t.id === task2.id)).toBe(true);
    });
  });

  describe('all', () => {
    it('should return all tasks', async () => {
      await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: '1' });
      await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: '2' });

      const all = await imece.tasks.all();
      expect(all).toHaveLength(2);
    });
  });

  describe('getAgentTasks', () => {
    it('should return tasks assigned to agent', async () => {
      await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: 'Zeynep task' });
      await imece.tasks.create({ createdBy: 'zeynep', assignedTo: 'ali', title: 'Ali task' });

      const zeynepTasks = await imece.tasks.getAgentTasks('zeynep');
      expect(zeynepTasks).toHaveLength(1);
      expect(zeynepTasks[0]?.title).toBe('Zeynep task');
    });
  });

  describe('isUnblocked', () => {
    it('should return true for task with no dependencies', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      expect(await imece.tasks.isUnblocked(task.id)).toBe(true);
    });

    it('should return false when dependencies not complete', async () => {
      const dep = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Dependency'
      });

      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        blockedBy: [dep.id]
      });

      expect(await imece.tasks.isUnblocked(task.id)).toBe(false);
    });

    it('should return true when dependencies complete', async () => {
      const dep = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Dependency'
      });

      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        blockedBy: [dep.id]
      });

      await imece.tasks.claim(dep.id, 'zeynep');
      await imece.tasks.complete(dep.id);

      expect(await imece.tasks.isUnblocked(task.id)).toBe(true);
    });

    it('should return false for non-existent task', async () => {
      expect(await imece.tasks.isUnblocked('nonexistent')).toBe(false);
    });
  });

  describe('delegate', () => {
    it('should delegate task via messenger', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test task',
        description: 'Test description',
        priority: 'high'
      });

      const message = await imece.tasks.delegate(task, imece.messages);

      expect(message.from).toBe('ali');
      expect(message.to).toBe('zeynep');
      expect(message.subject).toBe('Test task');
      expect(message.body).toContain('Test description');
      expect(message.priority).toBe('high');
    });

    it('should include acceptance criteria when present', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test task',
        description: 'Test description',
        acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        priority: 'normal'
      });

      const message = await imece.tasks.delegate(task, imece.messages);

      expect(message.body).toContain('Acceptance Criteria');
      expect(message.body).toContain('Criteria 1');
      expect(message.body).toContain('Criteria 2');
    });
  });

  describe('edge cases', () => {
    it('should handle complete with non-existent task', async () => {
      const result = await imece.tasks.complete('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw when completing already done task', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      await imece.tasks.claim(task.id, 'zeynep');
      await imece.tasks.complete(task.id);

      await expect(
        imece.tasks.complete(task.id)
      ).rejects.toThrow('already completed');
    });

    it('should handle block with non-existent task', async () => {
      const result = await imece.tasks.block('nonexistent', 'reason');
      expect(result).toBeNull();
    });

    it('should add note with completion note parameter', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test'
      });

      const completed = await imece.tasks.complete(task.id, 'Finished!');
      expect(completed?.notes).toHaveLength(1);
      expect(completed?.notes[0]?.text).toBe('Finished!');
    });

    it('should handle unblock non-existent task', async () => {
      const result = await imece.tasks.unblock('nonexistent');
      expect(result).toBeNull();
    });

    it('should list multiple statuses correctly', async () => {
      await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: 'p1' });
      const t2 = await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: 'a1' });
      await imece.tasks.claim(t2.id, 'zeynep');
      const t3 = await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: 'b1' });
      await imece.tasks.claim(t3.id, 'zeynep');
      await imece.tasks.block(t3.id, 'blocked');
      const t4 = await imece.tasks.create({ createdBy: 'ali', assignedTo: 'zeynep', title: 'd1' });
      await imece.tasks.claim(t4.id, 'zeynep');
      await imece.tasks.complete(t4.id);

      expect(await imece.tasks.listByStatus('pending')).toHaveLength(1);
      expect(await imece.tasks.listByStatus('active')).toHaveLength(1);
      expect(await imece.tasks.listByStatus('blocked')).toHaveLength(1);
      expect(await imece.tasks.listByStatus('done')).toHaveLength(1);
    });

    it('should handle multiple tags', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        tags: ['urgent', 'backend', 'api', 'v2']
      });

      expect(task.tags).toHaveLength(4);
      expect(task.tags).toContain('urgent');
    });

    it('should handle acceptance criteria', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        acceptanceCriteria: ['Code compiles', 'Tests pass', 'Docs updated']
      });

      expect(task.acceptanceCriteria).toHaveLength(3);
    });

    it('should return empty for agent with no tasks', async () => {
      const tasks = await imece.tasks.getAgentTasks('nobody');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('input limits', () => {
    it('should reject task description exceeding 50,000 characters', async () => {
      await expect(imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        description: 'x'.repeat(50_001)
      })).rejects.toThrow('Task description exceeds 50,000 character limit');
    });

    it('should reject task title exceeding 500 characters', async () => {
      await expect(imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'x'.repeat(501),
        description: 'test'
      })).rejects.toThrow('Task title exceeds 500 character limit');
    });

    it('should accept task description at exactly 50,000 characters', async () => {
      const task = await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'zeynep',
        title: 'Test',
        description: 'x'.repeat(50_000)
      });
      expect(task.description).toHaveLength(50_000);
    });
  });
});
