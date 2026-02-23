/**
 * Function generator — barrel re-export.
 */

export type { FnInput, FnSchema, FnGenResult } from './function-gen/function.types.js';

export { renderFunctionContent } from './function-gen/function-render.js';

export {
  renderTestContent,
  renderNamespaceBarrel,
  renderPrimitivesBarrel,
} from './function-gen/function-render-test.js';

export {
  loadFnSchema,
  generateFunction,
  updateNamespaceBarrel,
  updatePrimitivesBarrel,
} from './function-gen/function-generate.js';
