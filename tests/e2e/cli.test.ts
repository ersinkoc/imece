/**
 * E2E CLI Tests - Tests the imece CLI commands end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createTempImece, cleanup } from '../helpers/setup.js';

function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const cliPath = join(process.cwd(), 'dist/bin.js');
    const proc = spawn('node', [cliPath, ...args], { cwd });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

describe('CLI E2E', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempImece();
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  describe('help', () => {
    it('should show help', async () => {
      const { stdout, exitCode } = await runCli(['--help'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('İmece');
      expect(stdout).toContain('init');
      expect(stdout).toContain('status');
      expect(stdout).toContain('register');
    });
  });

  describe('init', () => {
    it('should initialize imece workspace', async () => {
      const { stdout, exitCode } = await runCli(['init', '--desc', 'Test project'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('initialized');

      // Verify directory structure
      const imeceDir = join(tempDir, '.imece');
      const entries = await fs.readdir(imeceDir);
      expect(entries).toContain('imece.json');
      expect(entries).toContain('agents');
      expect(entries).toContain('inbox');
      expect(entries).toContain('tasks');
      expect(entries).toContain('locks');
    });

    it('should reject double initialization', async () => {
      await runCli(['init'], tempDir);
      const { stderr, exitCode } = await runCli(['init'], tempDir);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('already initialized');
    });
  });

  describe('status', () => {
    it('should show status when initialized', async () => {
      await runCli(['init', '--desc', 'Test'], tempDir);
      const { stdout, exitCode } = await runCli(['status'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('İMECE STATUS');
    });

    it('should error when not initialized', async () => {
      const { stderr, exitCode } = await runCli(['status'], tempDir);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('not initialized');
    });
  });

  describe('agent commands', () => {
    beforeEach(async () => {
      await runCli(['init'], tempDir);
    });

    it('should register an agent', async () => {
      const { stdout, exitCode } = await runCli(
        ['register', 'ali', 'developer', '--caps', 'typescript,react', '--model', 'claude-opus-4-6'],
        tempDir
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain('ali');
      expect(stdout).toContain('developer');
    });

    it('should list agents', async () => {
      await runCli(['register', 'ali', 'developer'], tempDir);
      const { stdout, exitCode } = await runCli(['agents'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('ali');
    });

    it('should show agent profile', async () => {
      await runCli(['register', 'ali', 'developer'], tempDir);
      const { stdout, exitCode } = await runCli(['whoami', 'ali'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('ali');
    });

    it('should update heartbeat', async () => {
      await runCli(['register', 'ali', 'developer'], tempDir);
      const { exitCode } = await runCli(['heartbeat', 'ali'], tempDir);

      expect(exitCode).toBe(0);
    });

    it('should mark agent offline', async () => {
      await runCli(['register', 'ali', 'developer'], tempDir);
      const { stdout, exitCode } = await runCli(['offline', 'ali'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('offline');
    });
  });

  describe('messaging', () => {
    beforeEach(async () => {
      await runCli(['init'], tempDir);
      await runCli(['register', 'ali', 'developer'], tempDir);
      await runCli(['register', 'zeynep', 'tester'], tempDir);
    });

    it('should send a message', async () => {
      const { stdout, exitCode } = await runCli(
        ['send', 'ali', 'zeynep', 'Hello', '--body', 'Test message'],
        tempDir
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Message sent');
    });

    it('should check inbox', async () => {
      await runCli(['send', 'ali', 'zeynep', 'Hello'], tempDir);
      const { stdout, exitCode } = await runCli(['inbox', 'zeynep'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Hello');
    });

    it('should broadcast a message', async () => {
      const { stdout, exitCode } = await runCli(['broadcast', 'ali', 'Team meeting!'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Broadcast');
    });
  });

  describe('tasks', () => {
    beforeEach(async () => {
      await runCli(['init'], tempDir);
      await runCli(['register', 'ali', 'developer'], tempDir);
      await runCli(['register', 'zeynep', 'tester'], tempDir);
    });

    it('should create a task', async () => {
      const { stdout, exitCode } = await runCli(
        ['task', 'create', 'ali', 'zeynep', 'Fix bug', '--priority', 'high'],
        tempDir
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Task created');
    });

    it('should list tasks', async () => {
      await runCli(['task', 'create', 'ali', 'zeynep', 'Test task'], tempDir);
      const { stdout, exitCode } = await runCli(['task', 'list'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Test task');
    });

    it('should claim and complete a task', async () => {
      const { stdout: createOut } = await runCli(
        ['task', 'create', 'ali', 'zeynep', 'Test task'],
        tempDir
      );

      // Extract task ID from output (format: "Task created: abc123")
      const match = createOut.match(/Task created: ([a-z0-9]+)/);
      expect(match).toBeTruthy();
      const taskId = match![1]!;

      const { exitCode: claimCode } = await runCli(['task', 'claim', taskId, 'zeynep'], tempDir);
      expect(claimCode).toBe(0);

      const { stdout: completeOut, exitCode: completeCode } = await runCli(
        ['task', 'complete', taskId, '--note', 'Done!'],
        tempDir
      );
      expect(completeCode).toBe(0);
      expect(completeOut).toContain('completed');
    });
  });

  describe('locks', () => {
    beforeEach(async () => {
      await runCli(['init'], tempDir);
      await runCli(['register', 'ali', 'developer'], tempDir);
    });

    it('should lock and unlock a file', async () => {
      const { stdout: lockOut, exitCode: lockCode } = await runCli(
        ['lock', 'ali', 'src/app.ts'],
        tempDir
      );

      expect(lockCode).toBe(0);
      expect(lockOut).toContain('Locked');

      const { exitCode: listCode } = await runCli(['locks'], tempDir);
      expect(listCode).toBe(0);

      const { stdout: unlockOut, exitCode: unlockCode } = await runCli(
        ['unlock', 'ali', 'src/app.ts'],
        tempDir
      );

      expect(unlockCode).toBe(0);
      expect(unlockOut).toContain('Unlocked');
    });
  });

  describe('timeline', () => {
    beforeEach(async () => {
      await runCli(['init'], tempDir);
      await runCli(['register', 'ali', 'developer'], tempDir);
    });

    it('should show timeline', async () => {
      const { stdout, exitCode } = await runCli(['timeline'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout.length).toBeGreaterThan(0);
    });

    it('should search timeline', async () => {
      const { stdout, exitCode } = await runCli(['search', 'agent'], tempDir);

      expect(exitCode).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset workspace with confirm flag', async () => {
      await runCli(['init'], tempDir);
      const { stdout, exitCode } = await runCli(['reset', '--confirm'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('reset');

      const imeceDir = join(tempDir, '.imece');
      const exists = await fs.access(imeceDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });
});
