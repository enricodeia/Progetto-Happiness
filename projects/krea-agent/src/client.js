import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.KREA_API_BASE || 'https://api.krea.ai';

// Build auth header. Try in priority order:
// 1) explicit token in KREA_API_TOKEN
// 2) id:secret -> Bearer <id>:<secret>  (Krea docs indicate bearer format)
function getAuthHeader() {
  if (process.env.KREA_API_TOKEN) {
    return `Bearer ${process.env.KREA_API_TOKEN}`;
  }
  const id = process.env.KREA_API_KEY_ID;
  const secret = process.env.KREA_API_KEY_SECRET;
  if (!id || !secret) throw new Error('Missing KREA_API_KEY_ID / KREA_API_KEY_SECRET in .env');
  return `Bearer ${id}:${secret}`;
}

async function request(path, { method = 'GET', body, headers = {}, variant } = {}) {
  const auth = variant === 'basic'
    ? `Basic ${Buffer.from(`${process.env.KREA_API_KEY_ID}:${process.env.KREA_API_KEY_SECRET}`).toString('base64')}`
    : variant === 'secret-only'
    ? `Bearer ${process.env.KREA_API_KEY_SECRET}`
    : getAuthHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// Try multiple auth variants to find the one that works. Cache the result.
let verifiedVariant = null;

export async function verifyAuth() {
  if (verifiedVariant) return verifiedVariant;
  const variants = [undefined, 'secret-only', 'basic'];
  for (const v of variants) {
    try {
      await request('/jobs?limit=1', { variant: v });
      verifiedVariant = v || 'bearer-id-secret';
      return verifiedVariant;
    } catch (e) {
      if (e.status !== 401 && e.status !== 403) throw e;
    }
  }
  throw new Error('Auth failed for all variants. Check your API key.');
}

export async function api(path, opts = {}) {
  const variant = verifiedVariant === 'bearer-id-secret' ? undefined : verifiedVariant;
  return request(path, { ...opts, variant });
}

// Upload a local file as an asset. Returns { id, url } (actual shape varies).
export async function uploadAsset(filePath) {
  await verifyAuth();
  const auth = verifiedVariant === 'basic'
    ? `Basic ${Buffer.from(`${process.env.KREA_API_KEY_ID}:${process.env.KREA_API_KEY_SECRET}`).toString('base64')}`
    : verifiedVariant === 'secret-only'
    ? `Bearer ${process.env.KREA_API_KEY_SECRET}`
    : getAuthHeader();

  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const mime = filename.endsWith('.png') ? 'image/png'
             : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg'
             : filename.endsWith('.webp') ? 'image/webp'
             : 'application/octet-stream';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);

  const res = await fetch(`${BASE_URL}/assets`, {
    method: 'POST',
    headers: { 'Authorization': auth },
    body: form,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// Download an asset URL to local file
export async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return destPath;
}

// Poll a job until done. Returns the completed job record.
export async function pollJob(jobId, { interval = 2000, timeout = 600000, onTick } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const job = await api(`/jobs/${jobId}`);
    const status = job.status || job.state;
    if (onTick) onTick(job);
    if (status === 'completed' || status === 'succeeded' || status === 'success') return job;
    if (status === 'failed' || status === 'error' || status === 'cancelled') {
      throw new Error(`Job ${status}: ${job.error || job.error_message || JSON.stringify(job)}`);
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
}

export function outputDir() {
  const dir = path.resolve(process.cwd(), 'output');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
