/**
 * Flusk OTel configuration from environment variables
 */
export interface FluskOtelConfig {
  apiKey: string;
  endpoint: string;
  projectName: string;
  captureContent: boolean;
}

const DEFAULT_ENDPOINT = 'https://otel.flusk.dev';

export function loadConfig(): FluskOtelConfig {
  const apiKey = process.env['FLUSK_API_KEY'] || '';
  if (!apiKey) {
    console.warn('[flusk/otel] FLUSK_API_KEY not set — traces will not be authenticated');
  }

  return {
    apiKey,
    endpoint: process.env['FLUSK_ENDPOINT'] || DEFAULT_ENDPOINT,
    projectName: process.env['FLUSK_PROJECT_NAME'] || 'default',
    captureContent: process.env['FLUSK_CAPTURE_CONTENT'] !== 'false',
  };
}
