/**
 * Constants for project structure validation.
 */

export const REQUIRED_DIRECTORIES = [
  'packages',
  'packages/entities',
  'packages/entities/src',
  'packages/types',
  'packages/types/src',
  'packages/resources',
  'packages/resources/src',
  'packages/business-logic',
  'packages/business-logic/src',
  'packages/execution',
  'packages/execution/src',
];

export const REQUIRED_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];

export const RECOMMENDED_FILES = [
  '.gitignore',
  'docker-compose.yml',
  '.env.example',
  'README.md',
  'CLAUDE.md',
];

export const PACKAGE_NAMES = [
  'entities', 'types', 'resources', 'business-logic', 'execution',
];
