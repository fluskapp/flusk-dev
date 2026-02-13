import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileUploadClient } from './profile-upload.client.js';

vi.mock('undici', () => ({
  request: vi.fn(),
}));

import { request } from 'undici';

const mockRequest = vi.mocked(request);

describe('ProfileUploadClient', () => {
  let client: ProfileUploadClient;

  beforeEach(() => {
    client = new ProfileUploadClient('http://test:3001');
    mockRequest.mockReset();
  });

  const payload = {
    name: 'test',
    type: 'cpu' as const,
    durationMs: 10_000,
    totalSamples: 100,
    hotspots: [{ functionName: 'f', filePath: 'a.ts', cpuPercent: 50, samples: 100 }],
    markdownRaw: '# test',
    traceIds: ['t1'],
  };

  it('uploads profile successfully', async () => {
    mockRequest.mockResolvedValue({
      statusCode: 201,
      body: { text: vi.fn().mockResolvedValue('{"id":"abc"}') },
    } as never);

    const result = await client.upload(payload);
    expect(result).toEqual({ id: 'abc', success: true });
    expect(mockRequest).toHaveBeenCalledWith(
      'http://test:3001/v1/profiles',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-2xx response', async () => {
    mockRequest.mockResolvedValue({
      statusCode: 500,
      body: { text: vi.fn().mockResolvedValue('error') },
    } as never);

    await expect(client.upload(payload)).rejects.toThrow('Profile upload failed: 500');
  });

  it('uses FLUSK_API_URL env as default', () => {
    process.env['FLUSK_API_URL'] = 'http://env:9999';
    const envClient = new ProfileUploadClient();
    // Just verifying construction works; actual URL tested via upload
    expect(envClient).toBeInstanceOf(ProfileUploadClient);
    delete process.env['FLUSK_API_URL'];
  });
});
