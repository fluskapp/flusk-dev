/**
 * Template-based social post generation (no API key needed).
 */

import type { ReleaseData, SocialPosts } from '../types.js';
import { X_TEMPLATE, LINKEDIN_TEMPLATE, REDDIT_TEMPLATE } from './defaults.js';

export function generateFromTemplates(release: ReleaseData): SocialPosts {
  const vars: Record<string, string> = {
    version: release.version,
    headline: release.headline,
    key_feature: release.features[0] ?? 'performance improvements',
    features_list: release.features.map((f) => `• ${f}`).join('\n'),
    fixes_list: release.fixes.map((f) => `• ${f}`).join('\n'),
    date: release.date,
  };

  return {
    x: interpolate(X_TEMPLATE, vars),
    linkedin: interpolate(LINKEDIN_TEMPLATE, vars),
    reddit: interpolate(REDDIT_TEMPLATE, vars),
  };
}

function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key: string) => vars[key] ?? `{${key}}`,
  );
}
