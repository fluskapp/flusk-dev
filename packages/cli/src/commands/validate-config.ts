/**
 * Validate Config Command - flusk validate:config
 */

import { Command } from 'commander';
import { validateConfig } from '../validators/config.validator.js';
import { formatError, formatSuccess, formatWarning, formatErrorWithFix } from '../utils/ui.js';
import ora from 'ora';

export const validateConfigCommand = new Command('validate:config')
  .description('Validate configuration files (package.json, .env.example, docker-compose.yml, watt.json)')
  .action(async () => {
    const spinner = ora('Validating configuration files...').start();

    try {
      const result = await validateConfig();

      spinner.stop();

      if (result.valid) {
        console.log(formatSuccess('All configuration files are valid!'));
      } else {
        console.log(formatError('Configuration validation failed'));
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
