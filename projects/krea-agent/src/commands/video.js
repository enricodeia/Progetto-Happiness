import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import { api, verifyAuth, pollJob, downloadFile, outputDir } from '../client.js';
import { MODELS } from './models.js';
import { extractUrls } from './image.js';

function findVendor(modelId) {
  const m = (MODELS.video || []).find(x => x.id === modelId);
  if (m) return m.vendor;
  if (modelId.startsWith('kling')) return 'kling';
  if (modelId.startsWith('veo')) return 'google';
  if (modelId.startsWith('sora')) return 'openai';
  if (modelId.startsWith('seedance')) return 'bytedance';
  return null;
}

export async function videoCmd(prompt, opts) {
  await verifyAuth();
  const spinner = ora('Submitting...').start();
  try {
    const vendor = findVendor(opts.model);
    if (!vendor) throw new Error(`Unknown vendor for video model "${opts.model}"`);

    const body = {
      prompt,
      aspectRatio: opts.aspect,
      duration: parseInt(opts.duration),
    };

    // Handle start image
    if (opts.startImage) {
      if (/^https?:\/\//.test(opts.startImage)) {
        body.startImage = opts.startImage;
      } else if (fs.existsSync(opts.startImage)) {
        spinner.text = 'Uploading start image...';
        const asset = await uploadAsset(opts.startImage);
        body.startImage = asset.url || asset.asset_url || asset.id;
      } else {
        throw new Error(`Start image not found: ${opts.startImage}`);
      }
    }

    const submitPath = `/generate/video/${vendor}/${opts.model}`;
    const res = await api(submitPath, { method: 'POST', body });
    const jobId = res.id || res.job_id || res.jobId;
    spinner.text = `Job ${jobId} queued...`;

    if (!opts.wait || !jobId) {
      spinner.succeed(jobId ? `Job ${jobId} submitted.` : 'Submitted (no job id)');
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    const job = await pollJob(jobId, {
      interval: 5000,
      timeout: 900000,
      onTick: j => { spinner.text = `Job ${jobId}: ${j.status || j.state}...`; },
    });

    spinner.succeed(`Job ${jobId} done.`);

    const urls = extractUrls(job);
    if (!urls.length) {
      console.log(chalk.yellow('No result URL found:'));
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = (url.split('?')[0].split('.').pop() || 'mp4').toLowerCase();
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

async function uploadAsset(filePath) {
  // Placeholder: Krea supports POST /assets with multipart/form-data up to 75MB.
  // Needs boundary-encoded body — implement when first needed.
  throw new Error('Local file upload not yet implemented. Provide an https:// URL for startImage for now.');
}
