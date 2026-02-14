/** @generated —
 * Flusk OTel configuration from environment variables
 */
import { getLogger } from '@flusk/logger';

export interface FluskOtelConfig {
  apiKey: string;
  endpoint: string;
  projectName: string;
  captureContent: boolean;
}

const DEFAULT_ENDPOINT = 'https://otel.flusk.dev';
const logger = getLogger().child({ module: 'otel-config' });

export function loadConfig(): FluskOtelConfig {
  const apiKey = process.env['FLUSK_API_KEY'] || '';
  if (!apiKey) {
    logger.warn('FLUSK_API_KEY not set — traces will not be authenticated');
  }

  return {
    apiKey,
    endpoint: process.env['FLUSK_ENDPOINT'] || DEFAULT_ENDPOINT,
    projectName: process.env['FLUSK_PROJECT_NAME'] || 'default',
    captureContent: process.env['FLUSK_CAPTURE_CONTENT'] !== 'false',
  };
}
