import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import fs from 'node:fs';
import { api, verifyAuth, uploadAsset, pollJob, downloadFile, outputDir } from '../client.js';
import { ensurePng } from '../utils/svgToPng.js';
import { extractUrls } from './image.js';

// Resolve a ref: local path (SVG or PNG) -> upload and return URL.
// If already https URL, return as-is.
async function resolveRef(ref) {
  if (/^https?:\/\//.test(ref)) return ref;
  if (!fs.existsSync(ref)) throw new Error(`Reference file not found: ${ref}`);
  const pngPath = await ensurePng(ref, { size: 1024 });
  const uploaded = await uploadAsset(pngPath);
  // Krea response shape varies; look for url-like field
  const url = uploaded.url || uploaded.asset_url || uploaded.presigned_url || uploaded.uri
    || (uploaded.id ? `${process.env.KREA_API_BASE || 'https://api.krea.ai'}/assets/${uploaded.id}` : null);
  if (!url) throw new Error(`Upload succeeded but no URL found in response: ${JSON.stringify(uploaded)}`);
  return url;
}

export async function editCmd(prompt, opts) {
  await verifyAuth();
  const spinner = ora('Uploading reference...').start();
  try {
    const refs = [];
    const refList = Array.isArray(opts.ref) ? opts.ref : opts.ref ? [opts.ref] : [];
    for (const r of refList) {
      const url = await resolveRef(r);
      refs.push(url);
    }
    spinner.text = `Uploaded ${refs.length} reference image(s)`;

    const model = opts.model || 'nano-banana-2';
    const vendor = model.startsWith('nano-banana') ? 'google'
                  : model.startsWith('gpt-image') ? 'openai'
                  : model.startsWith('flux-1-kontext') ? 'bfl'
                  : 'google';

    const body = {
      prompt,
      imageUrls: refs,
    };
    if (opts.width) body.width = parseInt(opts.width);
    if (opts.height) body.height = parseInt(opts.height);
    if (opts.seed !== undefined) body.seed = parseInt(opts.seed);

    spinner.text = 'Submitting...';
    const submitPath = `/generate/image/${vendor}/${model}`;
    const res = await api(submitPath, { method: 'POST', body });
    const jobId = res.id || res.job_id || res.jobId;

    if (!jobId) {
      spinner.succeed('Response received (no job id)');
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    spinner.text = `Job ${jobId} queued...`;
    const job = await pollJob(jobId, {
      interval: 3000,
      timeout: 600000,
      onTick: j => { spinner.text = `Job ${jobId}: ${j.status || j.state}...`; },
    });
    spinner.succeed(`Job ${jobId} done.`);

    const urls = extractUrls(job);
    if (!urls.length) {
      console.log(chalk.yellow('No result URL found:'));
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    const outDir = opts.outDir || outputDir();
    fs.mkdirSync(outDir, { recursive: true });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = (url.split('?')[0].split('.').pop() || 'png').toLowerCase();
      const name = opts.name ? `${opts.name}${urls.length > 1 ? `-${i}` : ''}.${ext}`
                             : `${Date.now()}-${jobId.slice(0, 8)}${urls.length > 1 ? `-${i}` : ''}.${ext}`;
      const dest = path.join(outDir, name);
      await downloadFile(url, dest);
      console.log(chalk.green('  saved:'), dest);
    }
  } catch (e) {
    spinner.fail(e.message);
    if (e.body) console.error(chalk.dim(JSON.stringify(e.body, null, 2)));
    process.exit(1);
  }
}
