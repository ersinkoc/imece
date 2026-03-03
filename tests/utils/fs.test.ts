import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  readJson,
  writeJson,
  appendJsonl,
  readJsonl,
  listJsonFiles,
  ensureDir,
  exists,
  removeFile,
  removeDir
} from '../../src/utils/fs.js';

const TEST_DIR = join(process.cwd(), '.test-fs', Date.now().toString(36));

describe('File system utilities', () => {
  beforeEach(async () => {
    await ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await removeDir(TEST_DIR);
  });

  describe('readJson', () => {
    it('should read valid JSON file', async () => {
      const data = { name: 'test', value: 123 };
      await fs.writeFile(join(TEST_DIR, 'test.json'), JSON.stringify(data), 'utf8');

      const result = await readJson<{ name: string; value: number }>(join(TEST_DIR, 'test.json'));
      expect(result).toEqual(data);
    });

    it('should return null for non-existent file', async () => {
      const result = await readJson(join(TEST_DIR, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await fs.writeFile(join(TEST_DIR, 'invalid.json'), 'not json', 'utf8');
      const result = await readJson(join(TEST_DIR, 'invalid.json'));
      expect(result).toBeNull();
    });
  });

  describe('writeJson', () => {
    it('should write JSON file', async () => {
      const data = { test: true, nested: { value: 42 } };
      const filePath = join(TEST_DIR, 'output.json');

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should create parent directories', async () => {
      const data = { test: true };
      const filePath = join(TEST_DIR, 'nested', 'deep', 'file.json');

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should format JSON with indentation', async () => {
      const data = { a: 1 };
      const filePath = join(TEST_DIR, 'formatted.json');

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('appendJsonl', () => {
    it('should append to JSONL file', async () => {
      const filePath = join(TEST_DIR, 'events.jsonl');

      await appendJsonl(filePath, { event: 'first', time: 1 });
      await appendJsonl(filePath, { event: 'second', time: 2 });

      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]!)).toEqual({ event: 'first', time: 1 });
      expect(JSON.parse(lines[1]!)).toEqual({ event: 'second', time: 2 });
    });

    it('should create file if not exists', async () => {
      const filePath = join(TEST_DIR, 'new.jsonl');
      await appendJsonl(filePath, { test: true });

      const exists = await fs.access(filePath).then(() => true, () => false);
      expect(exists).toBe(true);
    });
  });

  describe('readJsonl', () => {
    it('should read JSONL file', async () => {
      const filePath = join(TEST_DIR, 'data.jsonl');
      await fs.writeFile(filePath, '{"a":1}\n{"b":2}\n{"c":3}\n', 'utf8');

      const result = await readJsonl<{ a?: number; b?: number; c?: number }>(filePath);
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    });

    it('should return empty array for non-existent file', async () => {
      const result = await readJsonl(join(TEST_DIR, 'nonexistent.jsonl'));
      expect(result).toEqual([]);
    });

    it('should limit results when specified', async () => {
      const filePath = join(TEST_DIR, 'data.jsonl');
      await fs.writeFile(filePath, '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n', 'utf8');

      const result = await readJsonl<{ n: number }>(filePath, 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ n: 3 });
      expect(result[1]).toEqual({ n: 4 });
    });

    it('should skip invalid lines', async () => {
      const filePath = join(TEST_DIR, 'data.jsonl');
      await fs.writeFile(filePath, '{"valid":true}\ninvalid json\n{"alsoValid":true}\n', 'utf8');

      const result = await readJsonl(filePath);
      expect(result).toHaveLength(2);
    });
  });

  describe('listJsonFiles', () => {
    it('should list only JSON files', async () => {
      await fs.writeFile(join(TEST_DIR, 'file1.json'), '{}', 'utf8');
      await fs.writeFile(join(TEST_DIR, 'file2.json'), '{}', 'utf8');
      await fs.writeFile(join(TEST_DIR, 'file3.txt'), '', 'utf8');
      await fs.mkdir(join(TEST_DIR, 'subdir'));

      const files = await listJsonFiles(TEST_DIR);
      expect(files).toContain('file1.json');
      expect(files).toContain('file2.json');
      expect(files).not.toContain('file3.txt');
      expect(files).not.toContain('subdir');
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await listJsonFiles(join(TEST_DIR, 'nonexistent'));
      expect(files).toEqual([]);
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      const dirPath = join(TEST_DIR, 'new', 'nested', 'dir');
      await ensureDir(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not fail if directory exists', async () => {
      const dirPath = join(TEST_DIR, 'exists');
      await fs.mkdir(dirPath);

      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = join(TEST_DIR, 'exists.txt');
      await fs.writeFile(filePath, '', 'utf8');

      expect(await exists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      expect(await exists(join(TEST_DIR, 'nonexistent.txt'))).toBe(false);
    });

    it('should return true for existing directory', async () => {
      expect(await exists(TEST_DIR)).toBe(true);
    });
  });

  describe('removeFile', () => {
    it('should remove existing file', async () => {
      const filePath = join(TEST_DIR, 'to-remove.txt');
      await fs.writeFile(filePath, '', 'utf8');

      await removeFile(filePath);

      expect(await exists(filePath)).toBe(false);
    });

    it('should not fail for non-existent file', async () => {
      await expect(removeFile(join(TEST_DIR, 'nonexistent.txt'))).resolves.not.toThrow();
    });
  });
});
