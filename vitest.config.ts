import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/helpers/',
        'benchmarks/',
        '*.config.ts',
        'src/types.ts',
        'src/bin.ts',
        'src/index.ts',
        'src/cli/**'
      ],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 98,
        branches: 93,
        functions: 100,
        lines: 98
      },
      ignoreEmptyLines: true,
      all: true
    }
  }
});
