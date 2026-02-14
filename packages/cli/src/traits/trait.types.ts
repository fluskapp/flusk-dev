/** @generated —
 * Core types for the trait-based code generation system.
 *
 * WHY: Traits are composable units of code generation. Each trait
 * produces code sections (imports, functions, types) that get merged
 * into final generated files. This decouples capabilities from templates.
 */

import type { EntitySchema, StorageTarget } from '../schema/index.js';

/** A code section produced by a trait */
export interface TraitCodeSection {
  /** Import statements to add */
  imports: string[];
  /** Type definitions to add */
  types: string[];
  /** Function implementations to add */
  functions: string[];
  /** SQL statements (migrations, indexes) */
  sql: string[];
  /** Route handler definitions */
  routes: string[];
}

/** Context passed to each trait during generation */
export interface TraitContext {
  /** The parsed entity schema */
  schema: EntitySchema;
  /** Which storage backend to generate for */
  storageTarget: StorageTarget;
  /** Table name derived from entity name */
  tableName: string;
  /** kebab-case entity name */
  kebabName: string;
  /** camelCase entity name */
  camelName: string;
}

/** Output produced by a single trait */
export interface TraitOutput {
  /** Trait that produced this output */
  traitName: string;
  /** Repository code sections */
  repository: TraitCodeSection;
  /** Route code sections */
  route: TraitCodeSection;
  /** Migration code sections */
  migration: TraitCodeSection;
}

/** Interface every trait must implement */
export interface Trait {
  /** Unique trait name matching capability key */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Other traits this depends on */
  readonly dependencies: string[];
  /** Generate code sections for the given context */
  generate(ctx: TraitContext): TraitOutput;
}
