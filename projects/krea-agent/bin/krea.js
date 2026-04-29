#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { imageCmd } from '../src/commands/image.js';
import { videoCmd } from '../src/commands/video.js';
import { editCmd } from '../src/commands/edit.js';
import { jobsCmd, statusCmd } from '../src/commands/jobs.js';
import { testAuthCmd } from '../src/commands/auth.js';
import { modelsCmd } from '../src/commands/models.js';

const program = new Command();
program
  .name('krea')
  .description('CLI bridge to Krea AI API')
  .version('0.1.0');

program
  .command('auth')
  .description('Verify API authentication')
  .action(testAuthCmd);

program
  .command('models')
  .description('List known Krea models')
  .action(modelsCmd);

program
  .command('image <prompt...>')
  .description('Generate an image')
  .option('-m, --model <model>', 'Model id', 'flux-1-dev')
  .option('-w, --width <n>', 'Width', '1024')
  .option('-h, --height <n>', 'Height', '1024')
  .option('-s, --steps <n>', 'Steps', '25')
  .option('-g, --guidance <n>', 'Guidance scale', '3')
  .option('--seed <n>', 'Seed')
  .option('--no-wait', 'Do not wait for completion')
  .action(async (promptParts, opts) => {
    await imageCmd(promptParts.join(' '), opts);
  });

program
  .command('edit <prompt...>')
  .description('Edit / re-render a reference image using a prompt (image-to-image)')
  .option('-r, --ref <path>', 'Reference image path (png/svg) or URL', (val, memo) => (memo ? [...memo, val] : [val]))
  .option('-m, --model <model>', 'Model id', 'nano-banana-2')
  .option('-w, --width <n>', 'Width')
  .option('-h, --height <n>', 'Height')
  .option('--seed <n>', 'Seed')
  .option('-o, --out-dir <dir>', 'Output directory')
  .option('-n, --name <name>', 'Output filename (without extension)')
  .action(async (promptParts, opts) => {
    if (!opts.ref || !opts.ref.length) throw new Error('Provide at least one --ref <path-or-url>');
    await editCmd(promptParts.join(' '), opts);
  });

program
  .command('video <prompt...>')
  .description('Generate a video')
  .option('-m, --model <model>', 'Model id', 'kling-1')
  .option('-d, --duration <n>', 'Duration seconds', '5')
  .option('-a, --aspect <ratio>', 'Aspect ratio', '16:9')
  .option('-i, --start-image <path>', 'Start image (file path or url)')
  .option('--no-wait', 'Do not wait for completion')
  .action(async (promptParts, opts) => {
    await videoCmd(promptParts.join(' '), opts);
  });

program
  .command('jobs')
  .description('List recent jobs')
  .option('-n, --limit <n>', 'Limit', '10')
  .action(jobsCmd);

program
  .command('status <jobId>')
  .description('Check a job status')
  .action(statusCmd);

program.parseAsync(process.argv).catch(err => {
  console.error(chalk.red('Error: ') + err.message);
  if (err.body) console.error(chalk.dim(JSON.stringify(err.body, null, 2)));
  process.exit(1);
});
