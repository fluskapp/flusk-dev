// --- BEGIN CUSTOM ---
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStart = vi.fn();
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('./config.js', () => ({
  loadConfig: () => ({ projectName: 'test-project', mode: 'local' }),
}));

vi.mock('./create-sdk.js', () => ({
  createSdk: () => ({ start: mockStart, shutdown: mockShutdown }),
}));

vi.mock('./utils/auto-register-flame.js', () => ({
  setupAutoFlame: () => Promise.resolve([]),
}));

vi.mock('./instrumentations/openai-v6.js', () => ({
  patchOpenAI: () => Promise.resolve(),
}));

vi.mock('@flusk/logger', () => ({
  getLogger: () => ({
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  }),
}));

describe('OTel register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports sdk and ready', async () => {
    const mod = await import('./register.js');
    expect(mod).toHaveProperty('sdk');
    expect(mod).toHaveProperty('ready');
  });

  it('starts the SDK on import', async () => {
    await import('./register.js');
    expect(mockStart).toHaveBeenCalled();
  });

  it('ready resolves to undefined (patchOpenAI completes)', async () => {
    const { ready } = await import('./register.js');
    await expect(ready).resolves.toBeUndefined();
  });
});
// --- END CUSTOM ---
