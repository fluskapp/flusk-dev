/**
 * CLI command recipe — scaffolds a new commander command + test.
 *
 * WHY: Adding a CLI command requires boilerplate (Command setup,
 * action handler, test file). This recipe generates it all and
 * reminds the user to register in flusk.ts.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import { toCamelCase } from '../generators/utils.js';
import { commandTemplate, testTemplate } from './cli-command.templates.js';

/** Generate the command file */
const generateCommand: RecipeStep = {
  name: 'generate-command',
  description: 'Generate commander command file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const desc = (ctx.options['description'] as string) ?? `The ${name} command`;
    const dir = resolve(ctx.projectRoot, 'packages/cli/src/commands');
    const content = commandTemplate(name, desc);
    return { files: [writeRecipeFile(ctx, dir, `${name}.ts`, content)] };
  },
};

/** Generate the test file */
const generateTest: RecipeStep = {
  name: 'generate-test',
  description: 'Generate command test file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const dir = resolve(ctx.projectRoot, 'packages/cli/src/commands');
    const content = testTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, `${name}.test.ts`, content)] };
  },
};

/** Auto-register the command in flusk.ts */
const registerCommand: RecipeStep = {
  name: 'register-command',
  description: 'Register command in packages/cli/bin/flusk.ts',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const camel = toCamelCase(name);
    const fluskTs = resolve(ctx.projectRoot, 'packages/cli/bin/flusk.ts');
    const { readFileSync, writeFileSync } = await import('node:fs');
    const content = readFileSync(fluskTs, 'utf-8');
    const importLine = `import { ${camel}Command } from '../src/commands/${name}.js';`;
    const addLine = `program.addCommand(${camel}Command);`;

    if (content.includes(importLine)) {
      return { files: [] };
    }

    const updated = content.replace(
      'program.parse(process.argv);',
      `// ${name} command\n${importLine}\n${addLine}\n\nprogram.parse(process.argv);`,
    );
    writeFileSync(fluskTs, updated, 'utf-8');
    return { files: [{ path: fluskTs, action: 'updated' }] };
  },
};

export const cliCommandRecipe: Recipe = {
  name: 'cli-command',
  description: 'Generate a CLI command with test file',
  steps: [generateCommand, generateTest, registerCommand],
};
