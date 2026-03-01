import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanFiles } from '../scan-engine.js';

describe('scanFiles', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'flusk-scan-'));
    writeFileSync(join(dir, 'a.ts'), `import OpenAI from 'openai';\nconst c = new OpenAI();`);
    writeFileSync(join(dir, 'b.ts'), `const x = 1;`);
    writeFileSync(join(dir, 'c.js'), `fetch('https://api.anthropic.com/v1/messages')`);
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'd.ts'), `import OpenAI from 'openai';`);
  });

  afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

  it('detects openai import', async () => {
    const results = await scanFiles(dir);
    const openaiFile = results.find(r => r.file.endsWith('a.ts'));
    expect(openaiFile).toBeDefined();
    expect(openaiFile!.providers[0].name).toBe('openai');
  });

  it('ignores files without LLM usage', async () => {
    const results = await scanFiles(dir);
    const plain = results.find(r => r.file.endsWith('b.ts'));
    expect(plain).toBeUndefined();
  });

  it('detects API endpoint patterns', async () => {
    const results = await scanFiles(dir);
    const anthro = results.find(r => r.file.endsWith('c.js'));
    expect(anthro).toBeDefined();
    expect(anthro!.providers[0].name).toBe('anthropic-api');
  });

  it('skips node_modules', async () => {
    const results = await scanFiles(dir);
    const nmFile = results.find(r => r.file.includes('node_modules'));
    expect(nmFile).toBeUndefined();
  });
});
