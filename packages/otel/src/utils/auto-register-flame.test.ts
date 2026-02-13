import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockIsFlameAvailable = vi.fn<() => Promise<boolean>>();

vi.mock('./detect-flame.js', () => ({
  isFlameAvailable: () => mockIsFlameAvailable(),
  resetFlameDetectionCache: vi.fn(),
}));

vi.mock('@platformatic/flame', () => ({
  startProfiling: vi.fn().mockResolvedValue({ markdown: '' }),
}));

describe('auto-register-flame', () => {
  const originalEnv = process.env['FLUSK_PROFILE_MODE'];

  beforeEach(() => {
    delete process.env['FLUSK_PROFILE_MODE'];
    mockIsFlameAvailable.mockReset();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['FLUSK_PROFILE_MODE'] = originalEnv;
    } else {
      delete process.env['FLUSK_PROFILE_MODE'];
    }
  });

  it('returns processors when flame is available', async () => {
    mockIsFlameAvailable.mockResolvedValue(true);
    const { setupAutoFlame } = await import('./auto-register-flame.js');
    const processors = await setupAutoFlame();
    expect(processors).toHaveLength(1);
  });

  it('returns empty when flame is not available', async () => {
    mockIsFlameAvailable.mockResolvedValue(false);
    const { setupAutoFlame } = await import('./auto-register-flame.js');
    const processors = await setupAutoFlame();
    expect(processors).toHaveLength(0);
  });

  it('returns empty when FLUSK_PROFILE_MODE=off', async () => {
    process.env['FLUSK_PROFILE_MODE'] = 'off';
    mockIsFlameAvailable.mockResolvedValue(true);
    const { setupAutoFlame } = await import('./auto-register-flame.js');
    const processors = await setupAutoFlame();
    expect(processors).toHaveLength(0);
  });
});
