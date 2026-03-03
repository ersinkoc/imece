import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImeceManager } from '../../src/core/imece.js';
import { createTempImece, cleanup, sleep } from '../helpers/setup.js';

describe('FileLocker', () => {
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

  describe('lock', () => {
    it('should lock a file', async () => {
      const lock = await imece.locks.lock('ali', 'src/app.ts', 'Refactoring');

      expect(lock.file).toBe('src/app.ts');
      expect(lock.agent).toBe('ali');
      expect(lock.reason).toBe('Refactoring');
      expect(lock.lockedAt).toBeDefined();
    });

    it('should throw if file already locked by another agent', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      await expect(
        imece.locks.lock('zeynep', 'src/app.ts')
      ).rejects.toThrow('already locked');
    });

    it('should allow same agent to lock again', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      // Same agent can lock again (updates the lock)
      const lock = await imece.locks.lock('ali', 'src/app.ts', 'Updated reason');
      expect(lock.agent).toBe('ali');
      expect(lock.reason).toBe('Updated reason');
    });
  });

  describe('unlock', () => {
    it('should unlock a file', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const unlocked = await imece.locks.unlock('ali', 'src/app.ts');

      expect(unlocked).toBe(true);
      expect(await imece.locks.isLocked('src/app.ts')).toBeNull();
    });

    it('should return false if file not locked', async () => {
      const unlocked = await imece.locks.unlock('ali', 'src/not-locked.ts');
      expect(unlocked).toBe(false);
    });

    it('should throw if locked by another agent', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      await expect(
        imece.locks.unlock('zeynep', 'src/app.ts')
      ).rejects.toThrow('locked by ali');
    });

    it('should allow force unlock', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const unlocked = await imece.locks.unlock('zeynep', 'src/app.ts', true);

      expect(unlocked).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should return lock info for locked file', async () => {
      await imece.locks.lock('ali', 'src/app.ts', 'Editing');

      const lock = await imece.locks.isLocked('src/app.ts');
      expect(lock).not.toBeNull();
      expect(lock?.agent).toBe('ali');
      expect(lock?.reason).toBe('Editing');
    });

    it('should return null for unlocked file', async () => {
      const lock = await imece.locks.isLocked('src/not-locked.ts');
      expect(lock).toBeNull();
    });
  });

  describe('listLocks', () => {
    it('should list all active locks', async () => {
      await imece.locks.lock('ali', 'src/file1.ts');
      await imece.locks.lock('zeynep', 'src/file2.ts');

      const locks = await imece.locks.listLocks();
      expect(locks).toHaveLength(2);
    });

    it('should return empty array when no locks', async () => {
      const locks = await imece.locks.listLocks();
      expect(locks).toEqual([]);
    });
  });

  describe('agentLocks', () => {
    it('should return locks for specific agent', async () => {
      await imece.locks.lock('ali', 'src/file1.ts');
      await imece.locks.lock('ali', 'src/file2.ts');
      await imece.locks.lock('zeynep', 'src/file3.ts');

      const aliLocks = await imece.locks.agentLocks('ali');
      expect(aliLocks).toHaveLength(2);
      expect(aliLocks.every(l => l.agent === 'ali')).toBe(true);
    });
  });

  describe('hasConflict', () => {
    it('should return false for unlocked file', async () => {
      const conflict = await imece.locks.hasConflict('ali', 'src/app.ts');
      expect(conflict).toBe(false);
    });

    it('should return false if locked by same agent', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const conflict = await imece.locks.hasConflict('ali', 'src/app.ts');
      expect(conflict).toBe(false);
    });

    it('should return true if locked by another agent', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const conflict = await imece.locks.hasConflict('zeynep', 'src/app.ts');
      expect(conflict).toBe(true);
    });
  });

  describe('releaseAll', () => {
    it('should release all agent locks', async () => {
      await imece.locks.lock('ali', 'src/file1.ts');
      await imece.locks.lock('ali', 'src/file2.ts');
      await imece.locks.lock('ali', 'src/file3.ts');

      const released = await imece.locks.releaseAll('ali');
      expect(released).toBe(3);

      const locks = await imece.locks.listLocks();
      expect(locks).toHaveLength(0);
    });

    it('should return 0 if no locks', async () => {
      const released = await imece.locks.releaseAll('ali');
      expect(released).toBe(0);
    });
  });

  describe('cleanStale', () => {
    it('should clean locks from stale agents', async () => {
      // Lock file
      await imece.locks.lock('ali', 'src/app.ts');

      // Simulate stale agent
      const ali = await imece.agents.get('ali');
      if (ali) {
        ali.lastSeen = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
        await imece.agents.updateMeta('ali', {}); // Save changes
      }

      const cleaned = await imece.locks.cleanStale(300, [ali!]);
      expect(cleaned).toBe(1);

      const locks = await imece.locks.listLocks();
      expect(locks).toHaveLength(0);
    });

    it('should not clean locks from active agents', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      const ali = await imece.agents.get('ali');
      const cleaned = await imece.locks.cleanStale(300, [ali!]);

      expect(cleaned).toBe(0);
    });
  });
});
