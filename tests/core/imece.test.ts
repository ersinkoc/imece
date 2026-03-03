import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup } from '../helpers/setup.js';

describe('ImeceManager', () => {
  let tempDir: string;
  let imece: ImeceManager;

  beforeEach(async () => {
    tempDir = await createTempImece();
    imece = new ImeceManager(tempDir);
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  describe('initialization', () => {
    it('should initialize imece workspace', async () => {
      await imece.init('Test project');

      expect(await imece.isInitialized()).toBe(true);

      const config = await imece.getConfig();
      expect(config).not.toBeNull();
      expect(config?.description).toBe('Test project');
      expect(config?.version).toBe('1.0.0');
    });

    it('should reject double initialization', async () => {
      await imece.init('First');
      await expect(imece.init('Second')).rejects.toThrow('already initialized');
    });

    it('should create directory structure', async () => {
      await imece.init();

      const fs = await import('fs/promises');
      const entries = await fs.readdir(`${tempDir}/.imece`);

      expect(entries).toContain('imece.json');
      expect(entries).toContain('agents');
      expect(entries).toContain('inbox');
      expect(entries).toContain('tasks');
      expect(entries).toContain('locks');
    });
  });

  describe('getConfig', () => {
    it('should return null if not initialized', async () => {
      const config = await imece.getConfig();
      expect(config).toBeNull();
    });

    it('should return config after initialization', async () => {
      await imece.init('My project');

      const config = await imece.getConfig();
      expect(config).toMatchObject({
        project: expect.any(String),
        version: '1.0.0',
        description: 'My project',
        settings: {
          staleThresholdSeconds: 300,
          maxAgents: 10,
          cleanupAfterHours: 24
        }
      });
    });
  });

  describe('getStatus', () => {
    it('should return null if not initialized', async () => {
      const status = await imece.getStatus();
      expect(status).toBeNull();
    });

    it('should return full status', async () => {
      await imece.init();

      // Register an agent
      await imece.agents.register({ name: 'ali', role: 'developer' });

      // Create a task
      await imece.tasks.create({
        createdBy: 'ali',
        assignedTo: 'ali',
        title: 'Test task',
        description: 'Test description'
      });

      const status = await imece.getStatus();

      expect(status).not.toBeNull();
      expect(status?.agents).toHaveLength(1);
      expect(status?.taskSummary.backlog).toBe(1);
      expect(status?.recentTimeline.length).toBeGreaterThan(0);
    });
  });

  describe('generatePrompt', () => {
    it('should generate agent prompt', () => {
      const prompt = imece.generatePrompt('ali', 'developer', {
        capabilities: ['typescript', 'testing'],
        model: 'claude-opus-4-6',
        isLead: true
      });

      expect(prompt).toContain('ali');
      expect(prompt).toContain('developer');
      expect(prompt).toContain('typescript');
      expect(prompt).toContain('testing');
      expect(prompt).toContain('claude-opus-4-6');
      expect(prompt).toContain('👑');
    });

    it('should handle minimal options', () => {
      const prompt = imece.generatePrompt('zeynep', 'tester');

      expect(prompt).toContain('zeynep');
      expect(prompt).toContain('tester');
    });
  });

  describe('reset', () => {
    it('should remove imece directory', async () => {
      await imece.init();
      expect(await imece.isInitialized()).toBe(true);

      await imece.reset();
      expect(await imece.isInitialized()).toBe(false);
    });
  });
});
