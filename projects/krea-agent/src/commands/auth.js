import chalk from 'chalk';
import { verifyAuth } from '../client.js';

export async function testAuthCmd() {
  process.stdout.write('Verifying auth... ');
  try {
    const variant = await verifyAuth();
    console.log(chalk.green('OK'));
    console.log(chalk.dim(`Auth variant: ${variant}`));
  } catch (e) {
    console.log(chalk.red('FAIL'));
    console.error(e.message);
    process.exit(1);
  }
}
