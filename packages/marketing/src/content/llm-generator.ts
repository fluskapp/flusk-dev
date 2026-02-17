/**
 * LLM-powered social post generation via OpenAI.
 */

import OpenAI from 'openai';
import type { ReleaseData, SocialPosts } from '../types.js';

const SYSTEM_PROMPT = `You generate social media posts for open-source dev tool releases.
Output JSON with keys: x, linkedin, reddit. No markdown fences.`;

function buildUserPrompt(release: ReleaseData): string {
  return `Generate posts for Flusk v${release.version}.
Headline: ${release.headline}
Features: ${release.features.join('; ')}
Fixes: ${release.fixes.join('; ')}

Rules:
- x: max 280 chars, concise, emoji, hashtags #opensource #devtools #LLM
- linkedin: professional, value-focused, 2-3 paragraphs
- reddit: technical, no hype, honest, for r/opensource r/node`;
}

export async function generateWithLlm(
  release: ReleaseData,
  apiKey: string,
): Promise<SocialPosts> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(release) },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as SocialPosts;

  return {
    x: parsed.x ?? '',
    linkedin: parsed.linkedin ?? '',
    reddit: parsed.reddit ?? '',
  };
}
