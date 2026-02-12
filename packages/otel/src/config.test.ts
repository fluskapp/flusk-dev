import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function load() {
    const mod = await import('./config.js');
    return mod.loadConfig();
  }

  it('loads defaults when no env vars set', async () => {
    vi.stubEnv('FLUSK_API_KEY', '');
    const config = await load();
    expect(config.endpoint).toBe('https://otel.flusk.dev');
    expect(config.projectName).toBe('default');
    expect(config.captureContent).toBe(true);
  });

  it('warns when FLUSK_API_KEY is missing', async () => {
    vi.stubEnv('FLUSK_API_KEY', '');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await load();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('FLUSK_API_KEY'));
    spy.mockRestore();
  });

  it('reads all env vars correctly', async () => {
    vi.stubEnv('FLUSK_API_KEY', 'sk-test');
    vi.stubEnv('FLUSK_ENDPOINT', 'https://custom.dev');
    vi.stubEnv('FLUSK_PROJECT_NAME', 'my-project');
    vi.stubEnv('FLUSK_CAPTURE_CONTENT', 'false');
    const config = await load();
    expect(config.apiKey).toBe('sk-test');
    expect(config.endpoint).toBe('https://custom.dev');
    expect(config.projectName).toBe('my-project');
    expect(config.captureContent).toBe(false);
  });

  it('captureContent defaults to true, only false when explicitly "false"', async () => {
    vi.stubEnv('FLUSK_API_KEY', 'sk-test');
    vi.stubEnv('FLUSK_CAPTURE_CONTENT', 'true');
    expect((await load()).captureContent).toBe(true);

    vi.resetModules();
    vi.stubEnv('FLUSK_CAPTURE_CONTENT', '0');
    expect((await load()).captureContent).toBe(true);

    vi.resetModules();
    vi.stubEnv('FLUSK_CAPTURE_CONTENT', 'false');
    expect((await load()).captureContent).toBe(false);
  });
});
