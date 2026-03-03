import { describe, it, expect } from 'vitest';
import {
  validatePriority,
  validateMessageType,
  validateStatus,
  validateTaskStatus
} from '../../src/utils/validate.js';

describe('Validation utilities', () => {
  describe('validatePriority', () => {
    it('should accept valid priorities', () => {
      expect(validatePriority('low')).toBe('low');
      expect(validatePriority('normal')).toBe('normal');
      expect(validatePriority('high')).toBe('high');
      expect(validatePriority('urgent')).toBe('urgent');
    });

    it('should reject invalid priorities', () => {
      expect(() => validatePriority('critical')).toThrow();
      expect(() => validatePriority('')).toThrow();
      expect(() => validatePriority('LOW')).toThrow();
    });
  });

  describe('validateMessageType', () => {
    it('should accept valid message types', () => {
      expect(validateMessageType('message')).toBe('message');
      expect(validateMessageType('task-delegate')).toBe('task-delegate');
      expect(validateMessageType('question')).toBe('question');
      expect(validateMessageType('status-update')).toBe('status-update');
      expect(validateMessageType('review-request')).toBe('review-request');
      expect(validateMessageType('approval')).toBe('approval');
      expect(validateMessageType('rejection')).toBe('rejection');
      expect(validateMessageType('blocker')).toBe('blocker');
      expect(validateMessageType('handoff')).toBe('handoff');
    });

    it('should reject invalid message types', () => {
      expect(() => validateMessageType('email')).toThrow();
      expect(() => validateMessageType('chat')).toThrow();
      expect(() => validateMessageType('')).toThrow();
    });
  });

  describe('validateStatus', () => {
    it('should accept valid agent statuses', () => {
      expect(validateStatus('online')).toBe('online');
      expect(validateStatus('busy')).toBe('busy');
      expect(validateStatus('idle')).toBe('idle');
      expect(validateStatus('waiting')).toBe('waiting');
      expect(validateStatus('offline')).toBe('offline');
    });

    it('should reject invalid statuses', () => {
      expect(() => validateStatus('active')).toThrow();
      expect(() => validateStatus('away')).toThrow();
      expect(() => validateStatus('')).toThrow();
    });
  });

  describe('validateTaskStatus', () => {
    it('should accept valid task statuses', () => {
      expect(validateTaskStatus('pending')).toBe('pending');
      expect(validateTaskStatus('active')).toBe('active');
      expect(validateTaskStatus('done')).toBe('done');
      expect(validateTaskStatus('blocked')).toBe('blocked');
    });

    it('should reject invalid task statuses', () => {
      expect(() => validateTaskStatus('in-progress')).toThrow();
      expect(() => validateTaskStatus('completed')).toThrow();
      expect(() => validateTaskStatus('')).toThrow();
    });
  });
});
