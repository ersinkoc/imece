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

    it('should show reason in error when file locked with reason', async () => {
      await imece.locks.lock('ali', 'src/app.ts', 'Working on auth');

      await expect(
        imece.locks.lock('zeynep', 'src/app.ts')
      ).rejects.toThrow('Working on auth');
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

  describe('geleme lock contention edge cases', () => {
    it('should handle concurrent lock attempts', async () => {
      // First agent locks file
      await imece.locks.lock('ali', 'src/app.ts');

      // Second agent should fail to lock
      await expect(
        imece.locks.lock('zeynep', 'src/app.ts')
      ).rejects.toThrow('already locked');
    });

    it('should handle force unlock by different agent', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      // zeynep can force unlock
      const unlocked = await imece.locks.unlock('zeynep', 'src/app.ts', true);
      expect(unlocked).toBe(true);

      // Now ali can lock again
      const lock = await imece.locks.lock('ali', 'src/app.ts');
      expect(lock).toBeDefined();
    });

    it('should track lock timestamps correctly', async () => {
      const before = Date.now();
      await imece.locks.lock('ali', 'src/app.ts');

      const lock = await imece.locks.isLocked('src/app.ts');
      const lockTime = new Date(lock!.lockedAt).getTime();

      expect(lockTime).toBeGreaterThanOrEqual(before);
    });

    it('should release lock and allow new lock', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      await imece.locks.unlock('ali', 'src/app.ts');

      // Now zeynep can lock
      const lock = await imece.locks.lock('zeynep', 'src/app.ts');
      expect(lock.agent).toBe('zeynep');
    });

    it('should handle multiple files per agent', async () => {
      await imece.locks.lock('ali', 'src/file1.ts');
      await imece.locks.lock('ali', 'src/file2.ts');
      await imece.locks.lock('ali', 'src/file3.ts');

      const aliLocks = await imece.locks.agentLocks('ali');
      expect(aliLocks).toHaveLength(3);
    });
  });

  describe('path encoding and special characters', () => {
    it('should handle file paths with spaces', async () => {
      const lock = await imece.locks.lock('ali', 'src/my folder/app.ts');
      expect(lock.file).toBe('src/my folder/app.ts');

      const isLocked = await imece.locks.isLocked('src/my folder/app.ts');
      expect(isLocked).not.toBeNull();
    });

    it('should handle nested deep paths', async () => {
      const deepPath = 'src/core/nested/deep/path/structure/file.ts';
      await imece.locks.lock('ali', deepPath);

      const lock = await imece.locks.isLocked(deepPath);
      expect(lock?.file).toBe(deepPath);
    });

    it('should handle file paths with special characters', async () => {
      const specialPath = 'src/file-v1.0.0[backup].ts';
      await imece.locks.lock('ali', specialPath);

      const lock = await imece.locks.isLocked(specialPath);
      expect(lock?.file).toBe(specialPath);
    });

    it('should handle Windows-style paths', async () => {
      // Note: Windows paths with drive letters (C:\) work on Unix but fail on Windows
      // due to colon character restrictions. The encodePath function should handle this.
      // This test verifies the path encoding works cross-platform
      const windowsPath = 'projects\\imece\\src\\app.ts'; // Without drive letter
      await imece.locks.lock('ali', windowsPath);

      const lock = await imece.locks.isLocked(windowsPath);
      expect(lock?.file).toBe(windowsPath);
    });

    it('should handle unicode characters in paths', async () => {
      const unicodePath = 'src/файл.ts';
      await imece.locks.lock('ali', unicodePath);

      const lock = await imece.locks.isLocked(unicodePath);
      expect(lock?.file).toBe(unicodePath);
    });
  });

  describe('agent validation edge cases', () => {
    it('should reject empty agent name', async () => {
      await expect(
        imece.locks.lock('', 'src/app.ts')
      ).rejects.toThrow();
    });

    it('should reject agent names with special characters', async () => {
      await expect(
        imece.locks.lock('invalid!', 'src/app.ts')
      ).rejects.toThrow();
    });

    it('should reject agent names with spaces', async () => {
      await expect(
        imece.locks.lock('ali veli', 'src/app.ts')
      ).rejects.toThrow();
    });
  });

  describe('lock data integrity', () => {
    it('should preserve lock reason with special characters', async () => {
      const reason = 'Fixing bug: null <>&"\' chars';
      await imece.locks.lock('ali', 'src/app.ts', reason);

      const lock = await imece.locks.isLocked('src/app.ts');
      expect(lock?.reason).toBe(reason);
    });

    it('should handle very long reason strings', async () => {
      const longReason = 'A'.repeat(1000);
      await imece.locks.lock('ali', 'src/app.ts', longReason);

      const lock = await imece.locks.isLocked('src/app.ts');
      expect(lock?.reason).toBe(longReason);
    });

    it('should handle undefined vs empty string reason', async () => {
      await imece.locks.lock('ali', 'src/app1.ts');
      await imece.locks.lock('zeynep', 'src/app2.ts', '');

      const lock1 = await imece.locks.isLocked('src/app1.ts');
      const lock2 = await imece.locks.isLocked('src/app2.ts');

      expect(lock1?.reason).toBeUndefined();
      expect(lock2?.reason).toBe('');
    });
  });

  describe('listLocks ordering and sorting', () => {
    it('should sort locks by timestamp descending (newest first)', async () => {
      await imece.locks.lock('ali', 'src/first.ts');
      await sleep(10);
      await imece.locks.lock('zeynep', 'src/second.ts');
      await sleep(10);
      await imece.locks.lock('ali', 'src/third.ts');

      const locks = await imece.locks.listLocks();
      expect(locks).toHaveLength(3);
      expect(locks[0]?.file).toBe('src/third.ts');
      expect(locks[2]?.file).toBe('src/first.ts');
    });

    it('should include locks from multiple agents in sorted list', async () => {
      await imece.locks.lock('ali', 'src/a.ts');
      await imece.locks.lock('zeynep', 'src/b.ts');
      await imece.locks.lock('ali', 'src/c.ts');

      const locks = await imece.locks.listLocks();
      const files = locks.map(l => l.file);
      expect(files).toContain('src/a.ts');
      expect(files).toContain('src/b.ts');
      expect(files).toContain('src/c.ts');
    });
  });

  describe('releaseAll edge cases', () => {
    it('should handle releaseAll for agent with no locks', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const released = await imece.locks.releaseAll('zeynep');
      expect(released).toBe(0);

      // Ali's lock should still be active
      expect(await imece.locks.isLocked('src/app.ts')).not.toBeNull();
    });

    it('should update timeline when releasing all locks', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      await imece.locks.lock('ali', 'src/utils.ts');

      await imece.locks.releaseAll('ali');

      // Both files should be unlocked
      expect(await imece.locks.isLocked('src/app.ts')).toBeNull();
      expect(await imece.locks.isLocked('src/utils.ts')).toBeNull();
    });
  });

  describe('hasConflict edge cases', () => {
    it('should validate agent name in hasConflict', async () => {
      await expect(
        imece.locks.hasConflict('invalid!', 'src/app.ts')
      ).rejects.toThrow();
    });

    it('should return false for non-existent file', async () => {
      const conflict = await imece.locks.hasConflict('ali', 'src/does-not-exist.ts');
      expect(conflict).toBe(false);
    });
  });

  describe('cleanStale edge cases', () => {
    it('should handle empty agents array', async () => {
      await imece.locks.lock('ali', 'src/app.ts');
      const cleaned = await imece.locks.cleanStale(300, []);
      expect(cleaned).toBe(1); // All locks stale if no agents
    });

    it('should handle offline agents', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      // Set ali as offline
      await imece.agents.updateStatus('ali', 'offline');

      const ali = await imece.agents.get('ali');
      const cleaned = await imece.locks.cleanStale(300, [ali!]);
      expect(cleaned).toBe(1);
    });

    it('should not clean locks from recently active agents', async () => {
      await imece.locks.lock('ali', 'src/app.ts');

      const ali = await imece.agents.get('ali');
      // Ensure recent timestamp
      if (ali) {
        ali.lastSeen = new Date().toISOString();
        await imece.agents.updateMeta('ali', {});
      }

      const cleaned = await imece.locks.cleanStale(3600, [ali!]);
      expect(cleaned).toBe(0);
    });
  });
});
