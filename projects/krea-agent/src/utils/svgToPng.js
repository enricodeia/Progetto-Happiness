import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Rasterize an SVG file to a PNG with a given size (square canvas).
// Optionally composite on a background color for models that prefer solid bg.
export async function svgToPng(svgPath, { size = 1024, background = 'transparent', outPath } = {}) {
  const svgBuffer = fs.readFileSync(svgPath);

  let img = sharp(svgBuffer, { density: 400 }).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (background !== 'transparent') {
    img = img.flatten({ background });
  }

  const out = outPath || svgPath.replace(/\.svg$/i, '.png');
  await img.png().toFile(out);
  return out;
}

// Ensure a file is PNG (converts SVG if needed). Returns path to PNG.
export async function ensurePng(filePath, opts = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return filePath;
  if (ext === '.svg') return svgToPng(filePath, opts);
  throw new Error(`Unsupported image format: ${ext}. Use .png or .svg.`);
}
