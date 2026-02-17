/**
 * Generates platform-specific social media post drafts.
 * Uses OpenAI if available, falls back to templates.
 */

import { createLogger } from '@flusk/logger';
import type { ReleaseData, SocialPosts } from '../types.js';
import { generateWithLlm } from './llm-generator.js';
import { generateFromTemplates } from '../templates/template-generator.js';

const log = createLogger({ name: 'marketing:social-posts' });

export async function generateSocialPosts(
  release: ReleaseData,
): Promise<SocialPosts> {
  const apiKey = process.env['OPENAI_API_KEY'];

  if (apiKey) {
    log.info('Using OpenAI for social post generation');
    try {
      return await generateWithLlm(release, apiKey);
    } catch (err) {
      log.warn('LLM generation failed, falling back to templates');
      log.debug(String(err));
    }
  } else {
    log.info('No OPENAI_API_KEY set, using template-based generation');
  }

  return generateFromTemplates(release);
}
