import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup, sleep } from '../helpers/setup.js';

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

  describe('register', () => {
    it('should register a new agent', async () => {
      const agent = await imece.agents.register({
        name: 'ali',
        role: 'developer',
        capabilities: ['typescript', 'react'],
        model: 'claude-opus-4-6',
        isLead: true
      });

      expect(agent.name).toBe('ali');
      expect(agent.role).toBe('developer');
      expect(agent.capabilities).toEqual(['typescript', 'react']);
      expect(agent.model).toBe('claude-opus-4-6');
      expect(agent.isLead).toBe(true);
      expect(agent.status).toBe('online');
      expect(agent.currentTask).toBeNull();
    });

    it('should use defaults for optional fields', async () => {
      const agent = await imece.agents.register({
        name: 'zeynep',
        role: 'tester'
      });

      expect(agent.capabilities).toEqual([]);
      expect(agent.model).toBe('unknown');
      expect(agent.isLead).toBe(false);
    });

    it('should reject duplicate names', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });
      await expect(
        imece.agents.register({ name: 'ali', role: 'tester' })
      ).rejects.toThrow('already exists');
    });

    it('should sanitize agent names', async () => {
      const agent = await imece.agents.register({
        name: 'Ali_Yilmaz',
        role: 'developer'
      });

      expect(agent.name).toBe('ali-yilmaz');
    });

    it('should reject invalid names', async () => {
      // Name with only special chars becomes empty after sanitization
      await expect(
        imece.agents.register({ name: '!!!', role: 'dev' })
      ).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should retrieve registered agent', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const agent = await imece.agents.get('ali');
      expect(agent).not.toBeNull();
      expect(agent?.name).toBe('ali');
    });

    it('should return null for non-existent agent', async () => {
      const agent = await imece.agents.get('nonexistent');
      expect(agent).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all agents sorted by name', async () => {
      await imece.agents.register({ name: 'cem', role: 'dev' });
      await imece.agents.register({ name: 'ali', role: 'dev' });
      await imece.agents.register({ name: 'buse', role: 'dev' });

      const agents = await imece.agents.list();
      expect(agents).toHaveLength(3);
      expect(agents[0]?.name).toBe('ali');
      expect(agents[1]?.name).toBe('buse');
      expect(agents[2]?.name).toBe('cem');
    });

    it('should return empty array when no agents', async () => {
      const agents = await imece.agents.list();
      expect(agents).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update agent status', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const updated = await imece.agents.updateStatus('ali', 'busy', 'task_123');

      expect(updated?.status).toBe('busy');
      expect(updated?.currentTask).toBe('task_123');
    });

    it('should return null for non-existent agent', async () => {
      const updated = await imece.agents.updateStatus('nonexistent', 'busy');
      expect(updated).toBeNull();
    });

    it('should reject invalid status', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      await expect(
        imece.agents.updateStatus('ali', 'invalid-status' as any)
      ).rejects.toThrow();
    });
  });

  describe('heartbeat', () => {
    it('should update lastSeen timestamp', async () => {
      const agent = await imece.agents.register({ name: 'ali', role: 'dev' });
      const oldLastSeen = agent.lastSeen;

      await sleep(10);
      const updated = await imece.agents.heartbeat('ali');

      expect(updated?.lastSeen).not.toBe(oldLastSeen);
    });

    it('should return null for non-existent agent', async () => {
      const updated = await imece.agents.heartbeat('nonexistent');
      expect(updated).toBeNull();
    });
  });

  describe('setWorkingFiles', () => {
    it('should update files being worked on', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const updated = await imece.agents.setWorkingFiles('ali', [
        'src/app.ts',
        'src/utils.ts'
      ]);

      expect(updated?.filesWorkingOn).toEqual(['src/app.ts', 'src/utils.ts']);
    });
  });

  describe('goOffline', () => {
    it('should mark agent offline', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const updated = await imece.agents.goOffline('ali');

      expect(updated?.status).toBe('offline');
      expect(updated?.currentTask).toBeNull();
      expect(updated?.filesWorkingOn).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove agent', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const removed = await imece.agents.remove('ali');
      expect(removed).toBe(true);

      const agent = await imece.agents.get('ali');
      expect(agent).toBeNull();
    });

    it('should return false for non-existent agent', async () => {
      const removed = await imece.agents.remove('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing agent', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });
      expect(await imece.agents.exists('ali')).toBe(true);
    });

    it('should return false for non-existent agent', async () => {
      expect(await imece.agents.exists('nonexistent')).toBe(false);
    });
  });

  describe('getLead and setLead', () => {
    it('should get current lead', async () => {
      await imece.agents.register({ name: 'ali', role: 'lead', isLead: true });

      const lead = await imece.agents.getLead();
      expect(lead?.name).toBe('ali');
    });

    it('should return null if no lead', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const lead = await imece.agents.getLead();
      expect(lead).toBeNull();
    });

    it('should set new lead', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const updated = await imece.agents.setLead('ali');
      expect(updated?.isLead).toBe(true);
    });

    it('should remove lead from previous lead', async () => {
      await imece.agents.register({ name: 'ali', role: 'lead', isLead: true });
      await imece.agents.register({ name: 'zeynep', role: 'dev' });

      await imece.agents.setLead('zeynep');

      const oldLead = await imece.agents.get('ali');
      expect(oldLead?.isLead).toBe(false);

      const newLead = await imece.agents.getLead();
      expect(newLead?.name).toBe('zeynep');
    });
  });

  describe('updateMeta', () => {
    it('should update agent metadata', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });

      const updated = await imece.agents.updateMeta('ali', {
        preferredEditor: 'vim',
        theme: 'dark'
      });

      expect(updated?.meta).toEqual({
        preferredEditor: 'vim',
        theme: 'dark'
      });
    });

    it('should merge with existing meta', async () => {
      await imece.agents.register({ name: 'ali', role: 'dev' });
      await imece.agents.updateMeta('ali', { first: 'value' });

      const updated = await imece.agents.updateMeta('ali', { second: 'value' });

      expect(updated?.meta).toEqual({
        first: 'value',
        second: 'value'
      });
    });
  });
});
