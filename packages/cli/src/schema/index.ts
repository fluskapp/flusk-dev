/** @generated —
 * Schema system barrel — public API for entity YAML schemas.
 */

export type { EntitySchema, StorageTarget } from './entity-schema.types.js';
export type { FieldSchema } from './field-schema.types.js';
export type { RelationSchema, RelationType, CascadeType } from './relation-schema.types.js';
export type { CapabilitySchema } from './capability-schema.types.js';
export type { QuerySchema, OrderByClause, AggregateFunction } from './query-schema.types.js';
export type { FieldType } from './field-types.js';
export { FIELD_TYPES, SQLITE_TYPE_MAP } from './field-types.js';
export { parseEntitySchema, SchemaValidationError } from './entity-schema.parser.js';
export { validateEntitySchema, validateEntitySchemas } from './entity-schema.validator.js';
export { loadEntityRegistry } from './entity-schema.registry.js';
export type { EntityRegistry } from './entity-schema.registry.js';
export { parseYamlFile, YamlParseError } from './parse-yaml-file.js';
export type { SchemaError } from './shape-validator.js';
export { runEntityPipeline } from './generate-entity-pipeline.js';
export type { PipelineResult } from './generate-entity-pipeline.js';
export { generateTypeBoxContent } from './generate-typebox.js';
export { generateMigrationSql } from './generate-migration.js';
export { generateTypesFileContent } from './generate-types-file.js';
