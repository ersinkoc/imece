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
  });
});
