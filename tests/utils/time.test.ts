import { describe, it, expect } from 'vitest';
import { now, relative, isStale, formatTime } from '../../src/utils/time.js';

describe('Time utilities', () => {
  describe('now', () => {
    it('should return ISO 8601 timestamp', () => {
      const timestamp = now();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return UTC timestamp', () => {
      const timestamp = now();
      expect(timestamp.endsWith('Z')).toBe(true);
    });
  });

  describe('relative', () => {
    it('should return "just now" for very recent timestamps', () => {
      const timestamp = new Date(Date.now() - 5000).toISOString();
      expect(relative(timestamp)).toBe('just now');
    });

    it('should return seconds for recent timestamps', () => {
      const timestamp = new Date(Date.now() - 30000).toISOString();
      expect(relative(timestamp)).toContain('sec');
    });

    it('should return "1 min ago" for timestamps around 1 minute', () => {
      const timestamp = new Date(Date.now() - 60 * 1000).toISOString();
      expect(relative(timestamp)).toBe('1 min ago');
    });

    it('should return minutes for timestamps within an hour', () => {
      const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(relative(timestamp)).toContain('min');
      expect(relative(timestamp)).not.toBe('1 min ago');
    });

    it('should return "1 hour ago" for timestamps around 1 hour', () => {
      const timestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(relative(timestamp)).toBe('1 hour ago');
    });

    it('should return hours for timestamps within a day', () => {
      const timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(relative(timestamp)).toContain('hours');
    });

    it('should return "1 day ago" for timestamps around 1 day', () => {
      const timestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(relative(timestamp)).toBe('1 day ago');
    });

    it('should return days for older timestamps', () => {
      const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(relative(timestamp)).toContain('days');
    });

    it('should return date string for very old timestamps', () => {
      const timestamp = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const result = relative(timestamp);
      // Should return locale date string like "2/1/2026" or similar
      expect(result).toMatch(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/);
    });
  });

  describe('isStale', () => {
    it('should return true for old timestamps', () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isStale(oldTimestamp, 300)).toBe(true);
    });

    it('should return false for recent timestamps', () => {
      const recentTimestamp = new Date(Date.now() - 60 * 1000).toISOString();
      expect(isStale(recentTimestamp, 300)).toBe(false);
    });

    it('should respect threshold parameter', () => {
      const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(isStale(timestamp, 600)).toBe(false);
      expect(isStale(timestamp, 60)).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('should format timestamp for display', () => {
      const timestamp = '2026-03-03T14:30:00.000Z';
      const formatted = formatTime(timestamp);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
