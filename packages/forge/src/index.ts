/**
 * @flusk/forge — Code generation framework for Flusk
 */

// Types
export type { FieldDefinition, EntityDefinition } from './types/entity.types.js';

// Config
export * from './config/index.js';

// Schema
export * from './schema/index.js';

// Generators
export { generateOtelHook } from './generators/otel-hook.generator.js';
export { generateProfile } from './generators/profile.generator.js';
export { generateSqliteRepo } from './generators/sqlite-repo.generator.js';
export { generatePlugin } from './generators/plugin.generator.js';
export { generateDockerCompose } from './generators/docker-compose.generator.js';
export { generateEntrypoint } from './generators/entrypoint.generator.js';
export { generateInfrastructure, generateInitDbScript } from './generators/infrastructure.generator.js';
export { generateTuiComponent, generateTuiHook, generateTuiApp, generateTuiScreen } from './generators/tui/index.js';
export { getMigrationNumber, toTableName, toKebabCase, toPascalCase, toCamelCase, toSnakeCase } from './generators/utils.js';
export { generateFeature } from './generators/feature.generator.js';
export { generateSwagger } from './generators/swagger.generator.js';
export { generateDetector } from './generators/detector.generator.js';
export { generatePackage } from './generators/package.generator.js';
export { generateService } from './generators/service.generator.js';
export { generateStandaloneRoute } from './generators/route.generator.js';
export { generateTypes } from './generators/types.generator.js';
export { generateResources } from './generators/resources.generator.js';
export { generateBusinessLogic } from './generators/business-logic.generator.js';
export { generateExecution } from './generators/execution.generator.js';
export { generateFastifyPlugin } from './generators/fastify-plugin.generator.js';
export { generateEnv } from './generators/env.generator.js';
export { generateDockerfile } from './generators/dockerfile.generator.js';
export { generateWatt } from './generators/watt.generator.js';
export { generateProvider } from './generators/provider.generator.js';
export { generateTest } from './generators/test.generator.js';
export { generateMiddleware } from './generators/middleware.generator.js';

// Python generators
export { generatePythonEntity } from './generators/python/entity.generator.js';
export { generatePythonTypes } from './generators/python/types.generator.js';
export { generatePythonRepository } from './generators/python/repository.generator.js';
export { generatePythonTest } from './generators/python/test.generator.js';
export { generatePyproject } from './generators/python/pyproject.generator.js';
export { generatePythonInit } from './generators/python/init.generator.js';
export { generateEntitySchemaContent, generateEntitySchema } from './generators/entity-schema.generator.js';
export type { GeneratorResult } from './generators/entity-schema.generator.js';

// Recipes
export * from './recipes/index.js';

// Traits
export * from './traits/index.js';

// Regeneration
export * from './regeneration/index.js';

// Validators
export { validateConfig } from './validators/config.validator.js';
export { validateSchemas } from './validators/schema.validator.js';
export { validateStructure } from './validators/structure.validator.js';
export { runValidation } from './validators/run-validation.js';

// Validation
export * from './validation/index.js';

// Wizard
export * from './wizard/index.js';
