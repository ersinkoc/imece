import { describe, it, expect } from 'vitest';
import {
  encodePath,
  decodePath,
  sanitizeAgentName,
  validateAgentName,
  getLockFilename
} from '../../src/utils/path.js';

describe('Path utilities', () => {
  describe('encodePath', () => {
    it('should encode forward slashes', () => {
      expect(encodePath('src/api/users.ts')).toBe('src__api__users.ts');
    });

    it('should handle nested paths', () => {
      expect(encodePath('a/b/c/d.ts')).toBe('a__b__c__d.ts');
    });

    it('should remove leading dots', () => {
      expect(encodePath('./src/file.ts')).toBe('src__file.ts');
    });

    it('should handle Windows-style paths', () => {
      expect(encodePath('src\\api\\users.ts')).toBe('src__api__users.ts');
    });
  });

  describe('decodePath', () => {
    it('should decode double underscores', () => {
      expect(decodePath('src__api__users.ts')).toBe('src/api/users.ts');
    });

    it('should handle multiple segments', () => {
      expect(decodePath('a__b__c__d.ts')).toBe('a/b/c/d.ts');
    });
  });

  describe('roundtrip', () => {
    it('should preserve path after encode/decode', () => {
      const original = 'src/components/Button.tsx';
      const encoded = encodePath(original);
      const decoded = decodePath(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('sanitizeAgentName', () => {
    it('should lowercase names', () => {
      expect(sanitizeAgentName('Ali')).toBe('ali');
    });

    it('should replace invalid characters with hyphens', () => {
      expect(sanitizeAgentName('ali_yilmaz')).toBe('ali-yilmaz');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeAgentName('-test-')).toBe('test');
    });

    it('should limit length to 20 characters', () => {
      expect(sanitizeAgentName('very-long-agent-name-that-exceeds')).toHaveLength(20);
    });

    it('should handle multiple invalid characters', () => {
      expect(sanitizeAgentName('Agent Name!@#')).toBe('agent-name');
    });
  });

  describe('validateAgentName', () => {
    it('should accept valid names', () => {
      expect(() => validateAgentName('ali')).not.toThrow();
      expect(() => validateAgentName('zeynep')).not.toThrow();
      expect(() => validateAgentName('test-agent')).not.toThrow();
      expect(() => validateAgentName('agent123')).not.toThrow();
    });

    it('should reject uppercase', () => {
      expect(() => validateAgentName('Ali')).toThrow();
    });

    it('should reject underscores', () => {
      expect(() => validateAgentName('ali_test')).toThrow();
    });

    it('should reject names longer than 20 chars', () => {
      expect(() => validateAgentName('very-long-agent-name-that-exceeds')).toThrow();
    });

    it('should reject leading hyphens', () => {
      expect(() => validateAgentName('-ali')).toThrow();
    });

    it('should reject trailing hyphens', () => {
      expect(() => validateAgentName('ali-')).toThrow();
    });

    it('should reject empty names', () => {
      expect(() => validateAgentName('')).toThrow();
    });
  });

  describe('getLockFilename', () => {
    it('should generate lock filename', () => {
      expect(getLockFilename('src/api/users.ts')).toBe('src__api__users.ts.lock.json');
    });

    it('should handle simple paths', () => {
      expect(getLockFilename('file.txt')).toBe('file.txt.lock.json');
    });
  });
});
