import chalk from 'chalk';

// Known Krea models (from API docs overview)
// Each model has its own endpoint: /generate/<kind>/<vendor>/<id>
const MODELS = {
  image: [
    { id: 'flux-1-dev', vendor: 'bfl', notes: 'fast, best for LoRAs' },
    { id: 'flux-1-pro', vendor: 'bfl', notes: 'higher quality' },
    { id: 'ideogram-3', vendor: 'ideogram', notes: 'text in images' },
    { id: 'imagen-4', vendor: 'google', notes: 'photorealism' },
    { id: 'nano-banana-2', vendor: 'google', notes: 'editing + composition' },
    { id: 'seedream-5-lite', vendor: 'bytedance', notes: 'stylized' },
  ],
  video: [
    { id: 'kling-1', vendor: 'kling', notes: 'high control, 5/10s' },
    { id: 'kling-2-6', vendor: 'kling', notes: 'latest kling' },
    { id: 'veo-3-1', vendor: 'google', notes: 'cinematic' },
    { id: 'sora-2', vendor: 'openai', notes: 'narrative' },
    { id: 'seedance-pro', vendor: 'bytedance', notes: 'motion/dance' },
  ],
};

export async function modelsCmd() {
  console.log(chalk.bold('Image models:'));
  for (const m of MODELS.image) {
    console.log(`  ${chalk.cyan(m.id.padEnd(22))} ${chalk.dim(m.vendor.padEnd(10))} ${chalk.dim(m.notes)}`);
  }
  console.log();
  console.log(chalk.bold('Video models:'));
  for (const m of MODELS.video) {
    console.log(`  ${chalk.cyan(m.id.padEnd(22))} ${chalk.dim(m.vendor.padEnd(10))} ${chalk.dim(m.notes)}`);
  }
  console.log();
  console.log(chalk.dim('Use -m <id> to pick. Full catalog: https://docs.krea.ai/api-reference'));
}

export { MODELS };
