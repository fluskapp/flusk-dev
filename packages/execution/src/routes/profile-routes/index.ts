import type { FastifyInstance } from 'fastify';
import { createProfileRoute } from './create-profile.js';
import { listProfilesRoute } from './list-profiles.js';
import { getProfileRoute } from './get-profile.js';
import { getCorrelationsRoute } from './get-correlations.js';
import { deleteProfileRoute } from './delete-profile.js';

/**
 * Profile session routes — /v1/profiles
 */
export async function profileRoutes(app: FastifyInstance): Promise<void> {
  await app.register(createProfileRoute);
  await app.register(listProfilesRoute);
  await app.register(getProfileRoute);
  await app.register(getCorrelationsRoute);
  await app.register(deleteProfileRoute);
}
