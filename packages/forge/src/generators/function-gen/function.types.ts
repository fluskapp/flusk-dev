/**
 * Types for the function generator.
 */

export interface FnInput {
  type: string;
  description: string;
}

export interface FnSchema {
  name: string;
  namespace: string;
  description: string;
  pure: boolean;
  generic?: boolean;
  typeParams?: string[];
  input: Record<string, FnInput>;
  output: { type: string; description: string };
  body: string | { steps: Array<{ name?: string; expr?: string; return?: string } | { return: string }> };
  tests: Array<{ name: string; input: Record<string, unknown>; expected: unknown }>;
}

export interface FnGenResult {
  files: Array<{ path: string; action: 'created' | 'updated' }>;
}
