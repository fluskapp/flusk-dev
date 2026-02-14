/** @generated —
 * Infrastructure Templates
 * Export all infrastructure template generators
 */

export { generateDockerComposeTemplate } from './docker-compose.template.js';
export type { DockerComposeOptions } from './docker-compose.template.js';

export { generateGitignoreTemplate } from './gitignore.template.js';

export { generateEnvTemplate } from './env.template.js';
export type { EnvTemplateOptions } from './env.template.js';

export { generateWattTemplate, generateWattServiceTemplate } from './watt.template.js';
export type { WattTemplateOptions } from './watt.template.js';

export { generateDockerfileTemplate } from './dockerfile.template.js';
export type { DockerfileOptions } from './dockerfile.template.js';

export { generateSwaggerTemplate } from './swagger.template.js';
export type { SwaggerTemplateOptions } from './swagger.template.js';

export { generateEntrypointTemplate } from './entrypoint.template.js';
export type { EntrypointOptions } from './entrypoint.template.js';
