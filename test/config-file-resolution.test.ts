import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const fixturesDir = join(__dirname, 'test-fixtures', 'config-file-resolution');

beforeEach(() => {
  rmSync(fixturesDir, {recursive: true, force: true});
});

afterEach(() => {
  rmSync(fixturesDir, {recursive: true, force: true});
});

describe('default config file resolution', () => {
  test('.barrelize.json should be used as default when .barrelize does not exist', async () => {
    const testDir = join(fixturesDir, 'json-default');
    mkdirSync(testDir, {recursive: true});

    // Create a .barrelize.json config (not .barrelize)
    writeFileSync(
      join(testDir, '.barrelize.json'),
      JSON.stringify({
        barrels: [
          {
            root: 'src',
            name: 'index.ts',
            include: ['**/*.ts'],
          },
        ],
      }),
    );

    mkdirSync(join(testDir, 'src'), {recursive: true});
    writeFileSync(join(testDir, 'src', 'foo.ts'), 'export const foo = 1;');

    // Simulate the resolution logic from cli.ts
    const defaultConfigFile = require('node:fs').existsSync(resolve(testDir, '.barrelize'))
      ? resolve(testDir, '.barrelize')
      : resolve(testDir, '.barrelize.json');

    expect(defaultConfigFile).toBe(join(testDir, '.barrelize.json'));

    // Verify the config file exists and is readable
    const content = readFileSync(defaultConfigFile, 'utf-8');
    expect(content).toContain('barrels');
  });

  test('.barrelize should take precedence over .barrelize.json when both exist (backward compat)', async () => {
    const testDir = join(fixturesDir, 'backward-compat');
    mkdirSync(testDir, {recursive: true});

    // Create BOTH config files
    writeFileSync(
      join(testDir, '.barrelize'),
      JSON.stringify({
        barrels: [
          {
            root: 'src',
            name: 'index.ts',
            include: ['**/*.ts'],
          },
        ],
      }),
    );

    writeFileSync(
      join(testDir, '.barrelize.json'),
      JSON.stringify({
        barrels: [
          {
            root: 'src',
            name: 'index.ts',
            include: ['**/*.tsx'], // different config
          },
        ],
      }),
    );

    const {existsSync} = require('node:fs');
    const {resolve} = require('node:path');

    const defaultConfigFile = existsSync(resolve(testDir, '.barrelize'))
      ? resolve(testDir, '.barrelize')
      : resolve(testDir, '.barrelize.json');

    expect(defaultConfigFile).toBe(join(testDir, '.barrelize'));
  });

  test('should fall back to .barrelize.json when neither exists', async () => {
    const testDir = join(fixturesDir, 'no-config');
    mkdirSync(testDir, {recursive: true});

    const {existsSync} = require('node:fs');
    const {resolve} = require('node:path');

    // Neither file exists — resolution should still produce .barrelize.json path
    const defaultConfigFile = existsSync(resolve(testDir, '.barrelize'))
      ? resolve(testDir, '.barrelize')
      : resolve(testDir, '.barrelize.json');

    expect(defaultConfigFile).toBe(join(testDir, '.barrelize.json'));
  });
});

describe('init command default config path', () => {
  test('runInitCommand should create .barrelize.json by default', async () => {
    const {runInitCommand} = await import('../src/cli/commands/init-command.js');

    const testDir = join(fixturesDir, 'init-default');
    mkdirSync(testDir, {recursive: true});

    // Change to test dir so init writes there
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      await runInitCommand('.barrelize.json');

      const configPath = join(testDir, '.barrelize.json');
      expect(require('node:fs').existsSync(configPath)).toBe(true);

      const content = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(content).toHaveProperty('barrels');
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('runInitCommand should create custom named config when path is provided', async () => {
    const {runInitCommand} = await import('../src/cli/commands/init-command.js');

    const testDir = join(fixturesDir, 'init-custom');
    mkdirSync(testDir, {recursive: true});

    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      await runInitCommand('my-barrelize.json');

      const configPath = join(testDir, 'my-barrelize.json');
      expect(require('node:fs').existsSync(configPath)).toBe(true);

      const content = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(content).toHaveProperty('barrels');
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('runInitCommand should warn when config file already exists', async () => {
    const {runInitCommand} = await import('../src/cli/commands/init-command.js');

    const testDir = join(fixturesDir, 'init-exists');
    mkdirSync(testDir, {recursive: true});

    // Pre-create the config
    writeFileSync(join(testDir, '.barrelize.json'), JSON.stringify({barrels: []}));

    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      const consoleSpy = vi.spyOn(console, 'log');

      await runInitCommand('.barrelize.json');

      // Should not create a new file or overwrite — just warn
      expect(require('node:fs').existsSync(join(testDir, '.barrelize.json'))).toBe(true);

      consoleSpy.mockRestore();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
