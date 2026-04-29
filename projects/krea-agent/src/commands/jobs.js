import chalk from 'chalk';
import { api, verifyAuth } from '../client.js';

export async function jobsCmd(opts) {
  await verifyAuth();
  const limit = parseInt(opts.limit || '10');
  const data = await api(`/jobs?limit=${limit}`);
  const jobs = data.jobs || data.items || (Array.isArray(data) ? data : []);
  if (!jobs.length) { console.log(chalk.dim('No jobs found.')); return; }
  for (const j of jobs) {
    const id = j.id || j.job_id;
    const status = j.status || j.state;
    const created = j.created_at || j.createdAt;
    console.log(`${chalk.cyan(id)} ${statusColor(status)} ${chalk.dim(created || '')}`);
  }
}

export async function statusCmd(jobId) {
  await verifyAuth();
  const job = await api(`/jobs/${jobId}`);
  console.log(JSON.stringify(job, null, 2));
}

function statusColor(s) {
  if (!s) return chalk.dim('unknown');
  s = String(s).toLowerCase();
  if (s.includes('complete') || s.includes('success')) return chalk.green(s);
  if (s.includes('fail') || s.includes('error') || s.includes('cancel')) return chalk.red(s);
  if (s.includes('pend') || s.includes('queue') || s.includes('running') || s.includes('processing')) return chalk.yellow(s);
  return s;
}
