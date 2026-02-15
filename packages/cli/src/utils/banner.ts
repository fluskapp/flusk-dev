/**
 * ASCII banner for Flusk CLI
 */

import chalk from 'chalk';

const logo = [
  ' ┌──┬──┐',
  ' │  │  │',
  ' │  ├──┘',
  ' │  │   ',
  ' └──┘   ',
];

const VERSION = '0.1.0';

export function printBanner(): void {
  const green = chalk.hex('#A3E635');
  const lines = logo.map((l) => green(l));
  lines[1] += `  ${chalk.bold.hex('#A3E635')('flusk')}`;
  lines[2] += `  ${chalk.dim(`v${VERSION}`)}`;
  console.log(lines.join('\n'));
  console.log();
}
