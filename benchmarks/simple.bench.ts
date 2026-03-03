/**
 * Simple performance benchmarks for İmece
 * Run: npx tsx benchmarks/simple.bench.ts
 */

import { bench, describe } from 'vitest';
import { ImeceManager } from '../src/core/imece.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createTempDir(): Promise<string> {
  const tempDir = join(__dirname, '.bench-temp', Date.now().toString());
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

async function cleanup(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true, force: true });
}

describe('ImeceManager', () => {
  bench('init workspace', async () => {
    const tempDir = await createTempDir();
    const imece = new ImeceManager(tempDir);
    await imece.init('Benchmark test');
    await cleanup(tempDir);
  }, { iterations: 10 });

  bench('register agent', async () => {
    const tempDir = await createTempDir();
    const imece = new ImeceManager(tempDir);
    await imece.init();
    await imece.agents.register({ name: 'ali', role: 'developer' });
    await cleanup(tempDir);
  }, { iterations: 10 });

  bench('create task', async () => {
    const tempDir = await createTempDir();
    const imece = new ImeceManager(tempDir);
    await imece.init();
    await imece.agents.register({ name: 'ali', role: 'dev' });
    await imece.agents.register({ name: 'zeynep', role: 'tester' });
    await imece.tasks.create({
      createdBy: 'ali',
      assignedTo: 'zeynep',
      title: 'Benchmark task'
    });
    await cleanup(tempDir);
  }, { iterations: 10 });

  bench('send message', async () => {
    const tempDir = await createTempDir();
    const imece = new ImeceManager(tempDir);
    await imece.init();
    await imece.agents.register({ name: 'ali', role: 'dev' });
    await imece.agents.register({ name: 'zeynep', role: 'tester' });
    await imece.messages.send({
      from: 'ali',
      to: 'zeynep',
      type: 'message',
      subject: 'Hello',
      body: 'Test message'
    });
    await cleanup(tempDir);
  }, { iterations: 10 });
});

describe('File operations', () => {
  bench('writeJson', async () => {
    const tempDir = await createTempDir();
    const { writeJson } = await import('../src/utils/fs.js');
    await writeJson(join(tempDir, 'test.json'), { test: true, data: 'benchmark' });
    await cleanup(tempDir);
  }, { iterations: 100 });

  bench('readJson', async () => {
    const tempDir = await createTempDir();
    const { writeJson, readJson } = await import('../src/utils/fs.js');
    const path = join(tempDir, 'test.json');
    await writeJson(path, { test: true, data: 'benchmark' });
    await readJson(path);
    await cleanup(tempDir);
  }, { iterations: 100 });
});

console.log('Run with: npx vitest run benchmarks/simple.bench.ts');
