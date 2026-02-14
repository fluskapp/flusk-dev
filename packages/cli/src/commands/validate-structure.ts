/** @generated —
 * Validate Structure Command - flusk validate:structure
 */

import { Command } from 'commander';
import { validateStructure } from '../validators/structure.validator.js';
import { formatError, formatSuccess, formatWarning, formatErrorWithFix } from '../utils/ui.js';
import ora from 'ora';

export const validateStructureCommand = new Command('validate:structure')
  .description('Validate project structure and file organization')
  .action(async () => {
    const spinner = ora('Validating project structure...').start();

    try {
      const result = await validateStructure();

      spinner.stop();

      if (result.valid) {
        console.log(formatSuccess('Project structure is valid!'));
      } else {
        console.log(formatError('Structure validation failed'));
      }

      // Display errors
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        for (const error of result.errors) {
          if (error.fix) {
            console.log(formatErrorWithFix(
              `${error.file}: ${error.message}`,
              error.fix
            ));
          } else {
            console.log(formatError(`${error.file}: ${error.message}`));
          }
        }
      }

      // Display warnings
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(formatWarning(`${warning.file}: ${warning.message}`));
        }
      }

      // Exit with appropriate code
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      spinner.stop();
      console.error(formatError('Validation failed'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
