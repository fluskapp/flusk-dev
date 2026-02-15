/**
 * Core types for the recipe-based code generation system.
 *
 * WHY: Recipes compose multiple generators into a single pipeline.
 * One command produces 8-12 files instead of running generators
 * one at a time. This is the "macro" layer above traits.
 */

/** A single step in a recipe pipeline */
export interface RecipeStep {
  /** Unique step name for logging */
  readonly name: string;
  /** Human-readable description shown in dry-run */
  readonly description: string;
  /** The generator function to execute */
  readonly run: (ctx: RecipeContext) => Promise<StepResult>;
  /** Skip this step when condition returns false */
  readonly when?: (ctx: RecipeContext) => boolean;
}

/** Shared state passed between recipe steps */
export interface RecipeContext {
  /** Absolute path to project root */
  projectRoot: string;
  /** User-provided options (YAML path, name, etc.) */
  options: Record<string, string | boolean>;
  /** Files generated so far (for rollback) */
  generatedFiles: string[];
  /** Shared data between steps (parsed schema, etc.) */
  shared: Record<string, unknown>;
  /** Dry-run mode — no files written */
  dryRun: boolean;
}

/** Result of a single step execution */
export interface StepResult {
  /** Files created or updated by this step */
  files: Array<{ path: string; action: 'created' | 'updated' }>;
  /** Data to merge into context.shared */
  shared?: Record<string, unknown>;
}

/** Hooks that run before/after the full recipe */
export interface RecipeHooks {
  /** Runs before the first step */
  before?: (ctx: RecipeContext) => Promise<void>;
  /** Runs after all steps complete */
  after?: (ctx: RecipeContext) => Promise<void>;
}

/** Full recipe definition */
export interface Recipe {
  /** Unique recipe name (kebab-case) */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Ordered steps to execute */
  readonly steps: RecipeStep[];
  /** Optional lifecycle hooks */
  readonly hooks?: RecipeHooks;
}

/** Final result of a recipe execution */
export interface RecipeResult {
  /** Recipe that was executed */
  recipeName: string;
  /** All files generated across all steps */
  files: Array<{ path: string; action: 'created' | 'updated' }>;
  /** Per-step timing and file counts */
  stepLogs: StepLog[];
  /** Total execution time in ms */
  totalMs: number;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/** Timing log for a single step */
export interface StepLog {
  stepName: string;
  durationMs: number;
  fileCount: number;
  skipped: boolean;
}
