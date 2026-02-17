/**
 * @flusk/marketing — automated release marketing content generation.
 */

export { generateReleaseNotes } from './content/generate-release-notes.js';
export { generateSocialPosts } from './content/generate-social-posts.js';
export { generateReleaseVideo } from './video/generate-release-video.js';
export { generateOgImage } from './images/generate-og-image.js';
export { createDraftPr } from './drafts/create-draft-pr.js';
export { publishAll } from './publish/publish-all.js';
export type {
  ReleaseData,
  SocialPosts,
  GeneratedContent,
  PublishResult,
} from './types.js';
