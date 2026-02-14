/**
 * Profile Upload Client — POSTs profile data to /v1/profiles
 * Uses undici.request() following existing client patterns
 */
import { request } from 'undici';

export interface ProfileUploadPayload {
  name: string;
  type: 'cpu' | 'heap';
  durationMs: number;
  totalSamples: number;
  hotspots: Array<{
    functionName: string;
    filePath: string;
    cpuPercent: number;
    samples: number;
  }>;
  markdownRaw: string;
  traceIds: string[];
}

export interface ProfileUploadResult {
  id: string;
  success: boolean;
}

export class ProfileUploadClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl
      ?? process.env['FLUSK_API_URL']
      ?? 'http://localhost:3001';
  }

  async upload(payload: ProfileUploadPayload): Promise<ProfileUploadResult> {
    const url = `${this.baseUrl}/v1/profiles`;
    const body = JSON.stringify(payload);

    const { statusCode, body: resBody } = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    const text = await resBody.text();

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Profile upload failed: ${statusCode} ${text}`);
    }

    const data = JSON.parse(text) as { id: string };
    return { id: data.id, success: true };
  }
}
