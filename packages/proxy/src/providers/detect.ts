/**
 * Detect LLM provider from request URL path and headers.
 */

export type ProviderName = 'openai' | 'anthropic' | 'unknown';
export type EndpointType = 'chat' | 'completions' | 'embeddings' | 'messages' | 'unknown';

export interface ProviderInfo {
  provider: ProviderName;
  endpoint: EndpointType;
}

const ROUTE_MAP: Array<{ path: string; provider: ProviderName; endpoint: EndpointType }> = [
  { path: '/v1/chat/completions', provider: 'openai', endpoint: 'chat' },
  { path: '/v1/completions', provider: 'openai', endpoint: 'completions' },
  { path: '/v1/embeddings', provider: 'openai', endpoint: 'embeddings' },
  { path: '/v1/messages', provider: 'anthropic', endpoint: 'messages' },
];

/** Detect provider from URL path and request headers. */
export function detectProvider(
  path: string,
  headers: Record<string, string | undefined>,
): ProviderInfo {
  for (const route of ROUTE_MAP) {
    if (path === route.path) {
      return { provider: route.provider, endpoint: route.endpoint };
    }
  }

  // Anthropic header-based detection
  if (headers['x-api-key'] && headers['anthropic-version']) {
    return { provider: 'anthropic', endpoint: 'unknown' };
  }

  return { provider: 'unknown', endpoint: 'unknown' };
}
