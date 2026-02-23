/**
 * Types for the pipeline generator.
 */

export interface PipelineStep {
  id: string;
  fn?: string;
  pipeline?: string;
  expr?: string;
  value?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: string;
}

export interface PipelineField {
  type: string;
  description?: string;
}

export interface PipelineSchema {
  name: string;
  namespace: string;
  description: string;
  package: string;
  input: Record<string, { type: string; description?: string }>;
  output: {
    type: string;
    fields?: Record<string, PipelineField>;
  };
  steps: PipelineStep[];
  tests?: Array<{
    name: string;
    input: Record<string, unknown>;
    expected: unknown;
  }>;
}

export interface PipelineGenResult {
  files: Array<{ path: string; action: string }>;
}
