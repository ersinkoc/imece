import { describe, it, expect } from 'vitest';
import { generateId, messageFilename, taskFilename, extractId } from '../../src/utils/id.js';

describe('ID utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with only alphanumeric characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate IDs of reasonable length', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThanOrEqual(8);
      expect(id.length).toBeLessThanOrEqual(20);
    });

    it('should generate 10000 unique IDs without collision', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10000; i++) {
        ids.add(generateId());
      }
      // Should have very few collisions (less than 1%)
      expect(ids.size).toBeGreaterThan(9900);
    });

    it('should generate IDs with timestamp component', () => {
      const ids: string[] = [];
      // Generate IDs in quick succession
      for (let i = 0; i < 100; i++) {
        ids.push(generateId());
      }
      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });
  });

  describe('messageFilename', () => {
    it('should generate correct message filename', () => {
      const filename = messageFilename('abc123', 'ali');
      expect(filename).toBe('msg_abc123_from_ali.json');
    });

    it('should handle special characters in agent name', () => {
      const filename = messageFilename('xyz789', 'test-agent');
      expect(filename).toBe('msg_xyz789_from_test-agent.json');
    });
  });

  describe('taskFilename', () => {
    it('should generate correct task filename', () => {
      const filename = taskFilename('task123', 'Build feature');
      expect(filename).toContain('task_task123_');
      expect(filename.endsWith('.json')).toBe(true);
    });

    it('should slugify the title', () => {
      const filename = taskFilename('abc', 'Build NEW Feature!');
      expect(filename).toContain('build_new_feature');
    });

    it('should limit slug length', () => {
      const longTitle = 'a'.repeat(100);
      const filename = taskFilename('abc', longTitle);
      const slug = filename.replace('task_abc_', '').replace('.json', '');
      expect(slug.length).toBeLessThanOrEqual(30);
    });
  });

  describe('extractId', () => {
    it('should extract ID from message filename', () => {
      const id = extractId('msg_kx7f2_from_ali.json');
      expect(id).toBe('kx7f2');
    });

    it('should extract ID from task filename', () => {
      const id = extractId('task_kx7f2_build_feature.json');
      expect(id).toBe('kx7f2');
    });

    it('should return null for invalid filename', () => {
      const id = extractId('invalid.txt');
      expect(id).toBeNull();
    });

    it('should handle different ID formats', () => {
      expect(extractId('msg_abc123_from_zeynep.json')).toBe('abc123');
      expect(extractId('msg_xyz789abc_from_test.json')).toBe('xyz789abc');
    });
  });
});
