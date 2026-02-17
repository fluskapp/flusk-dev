/**
 * Shared types for marketing content generation.
 */

export interface ReleaseData {
  version: string;
  date: string;
  headline: string;
  features: string[];
  breakingChanges: string[];
  fixes: string[];
  rawChangelog: string;
}

export interface SocialPosts {
  x: string;
  linkedin: string;
  reddit: string;
}

export interface GeneratedContent {
  release: ReleaseData;
  posts: SocialPosts;
  videoPath?: string;
  gifPath?: string;
  ogImagePath?: string;
}

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}
