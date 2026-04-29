import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import { api, verifyAuth, pollJob, downloadFile, outputDir } from '../client.js';
import { MODELS } from './models.js';

function findVendor(modelId, kind = 'image') {
  const list = MODELS[kind] || [];
  const m = list.find(x => x.id === modelId);
  if (m) return m.vendor;
  // Fallback: derive from common prefixes
  if (modelId.startsWith('flux')) return 'bfl';
  if (modelId.startsWith('ideogram')) return 'ideogram';
  if (modelId.startsWith('imagen') || modelId.startsWith('nano-banana')) return 'google';
  if (modelId.startsWith('seedream')) return 'bytedance';
  return null;
}

export async function imageCmd(prompt, opts) {
  await verifyAuth();
  const spinner = ora('Submitting...').start();
  try {
    const vendor = findVendor(opts.model, 'image');
    if (!vendor) throw new Error(`Unknown vendor for model "${opts.model}". Add it to MODELS map in src/commands/models.js.`);

    const body = {
      prompt,
      width: parseInt(opts.width),
      height: parseInt(opts.height),
      steps: parseInt(opts.steps),
      guidance_scale_flux: parseFloat(opts.guidance),
    };
    if (opts.seed !== undefined) body.seed = parseInt(opts.seed);

    const submitPath = `/generate/image/${vendor}/${opts.model}`;
    const res = await api(submitPath, { method: 'POST', body });

    const jobId = res.id || res.job_id || res.jobId;
    spinner.text = `Job ${jobId} queued...`;
    if (!jobId) {
      spinner.succeed('Response received (no job id)');
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    if (!opts.wait) {
      spinner.succeed(`Job ${jobId} submitted. Use "krea status ${jobId}" to check.`);
      return;
    }

    const job = await pollJob(jobId, {
      onTick: j => { spinner.text = `Job ${jobId}: ${j.status || j.state}...`; },
    });

    spinner.succeed(`Job ${jobId} done.`);

    // Find result URL(s)
    const urls = extractUrls(job);
    if (!urls.length) {
      console.log(chalk.yellow('No result URL found. Raw job:'));
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = (url.split('?')[0].split('.').pop() || 'png').toLowerCase();
      const filename = `${Date.now()}-${jobId.slice(0, 8)}${urls.length > 1 ? `-${i}` : ''}.${ext}`;
      const dest = path.join(outputDir(), filename);
      await downloadFile(url, dest);
      console.log(chalk.green('  saved:'), dest);
    }
  } catch (e) {
    spinner.fail(e.message);
    if (e.body) console.error(chalk.dim(JSON.stringify(e.body, null, 2)));
    process.exit(1);
  }
}

function extractUrls(job) {
  const urls = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string' && /^https?:\/\//.test(v) && /\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)(\?|$)/i.test(v)) urls.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(job);
  return [...new Set(urls)];
}

export { extractUrls };
