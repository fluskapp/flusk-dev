/**
 * Resolve upstream URL from provider or explicit config.
 */

const UPSTREAM_MAP: Record<string, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
};

/** Resolve upstream base URL. Returns null if unknown. */
export function resolveUpstream(
  provider: string,
  explicit?: string,
): string | null {
  if (explicit) {
    return UPSTREAM_MAP[explicit] ?? explicit;
  }
  return UPSTREAM_MAP[provider] ?? null;
}
