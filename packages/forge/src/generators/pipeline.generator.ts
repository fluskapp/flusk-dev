/**
 * Pipeline generator — barrel re-export.
 *
 * WHY: Pipelines compose registered functions and other pipelines into
 * multi-step business logic.
 */

export type {
  PipelineStep,
  PipelineField,
  PipelineSchema,
  PipelineGenResult,
} from './pipeline/pipeline.types.js';

export { loadPipelineSchema } from './pipeline/pipeline-helpers.js';

export {
  generatePipelineCode,
  generatePipelineTest,
} from './pipeline/pipeline-codegen.js';

export {
  generatePipeline,
  generateAllPipelines,
} from './pipeline/pipeline-generate.js';
