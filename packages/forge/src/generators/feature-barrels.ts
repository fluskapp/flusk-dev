/**
 * Feature generator — barrel update orchestration.
 */

import {
  updateEntitiesBarrel,
  updateTypesBarrel,
  updateResourcesBarrel,
  updateBusinessLogicBarrel,
  updateAppRegistration,
} from './barrel-updater.js';
import type { FeatureOptions, FeatureResult } from './feature.generator.js';

export async function updateBarrels(
  entityName: string,
  root: string,
  options: FeatureOptions,
  result: FeatureResult,
): Promise<void> {
  if (!options.skipEntity) {
    await updateEntitiesBarrel(entityName, root);
    result.files.push({
      path: 'packages/entities/src/index.ts',
      action: 'updated',
    });
    await updateTypesBarrel(entityName, root);
    result.files.push({
      path: 'packages/types/src/index.ts',
      action: 'updated',
    });
  }
  await updateResourcesBarrel(entityName, root);
  result.files.push({
    path: 'packages/resources/src/index.ts',
    action: 'updated',
  });
  await updateBusinessLogicBarrel(entityName, root);
  result.files.push({
    path: 'packages/business-logic/src/index.ts',
    action: 'updated',
  });
  if (!options.skipRoutes) {
    await updateAppRegistration(entityName, root);
    result.files.push({
      path: 'packages/execution/src/app.ts',
      action: 'updated',
    });
  }
}
