// Engraving overlay — render text to a white-on-black ImageData that gets
// composited into the height map (and optionally the diffuse) so the surface
// appears chiselled into the rock.
//
// The actual integration with normal/AO/displacement happens in textureMaps.js;
// here we just produce the mask.

export const ENGRAVING_FONTS = [
  'Impact',
  'Arial Black',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Trebuchet MS',
  'Verdana',
  'Palatino',
  'Garamond',
  'Optima',
  'Brush Script MT',
  'Copperplate',
  'Futura',
  'Cinzel',
  'Trajan Pro'
];

const measureLines = (ctx, text) => text.split(/\\n|\n/).map((line) => line || ' ');

// Renders the engraving mask: black background, soft-white text with a
// gaussian blur to give the recessed groove a subtle bevel when normals
// are computed downstream.
export const renderEngraving = ({
  size = 512,
  text = 'STONE',
  font = 'Impact',
  fontSizeRel = 0.18,   // fraction of canvas size
  x = 0.5,              // center [0,1]
  y = 0.5,              // center [0,1]
  rotationDeg = 0,
  weight = 700,
  letterSpacing = 0,    // px
  bevel = 0.006,        // gaussian blur radius as fraction of size
  lineHeight = 1.1
}) => {
  if (!text) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background = 0 (no engraving)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // Foreground = white where text is (= maximum recess)
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = Math.max(8, Math.round(fontSizeRel * size));
  ctx.font = `${weight} ${px}px "${font}", sans-serif`;

  // Soften with gaussian blur to give the engraving sloped walls. We do this
  // BEFORE writing the text by drawing into a separate canvas, blurring, then
  // copying back — so the mask we return already includes the bevel.
  const lines = measureLines(ctx, String(text));
  const lh = px * lineHeight;
  const totalH = lh * (lines.length - 1);

  ctx.save();
  ctx.translate(x * size, y * size);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  // Letter spacing: draw character-by-character if requested.
  lines.forEach((line, i) => {
    const oy = i * lh - totalH / 2;
    if (letterSpacing && Math.abs(letterSpacing) > 0.01) {
      const widths = [...line].map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (line.length - 1);
      let cx = -total / 2;
      [...line].forEach((c, k) => {
        ctx.fillText(c, cx + widths[k] / 2, oy);
        cx += widths[k] + letterSpacing;
      });
    } else {
      ctx.fillText(line, 0, oy);
    }
  });
  ctx.restore();

  if (bevel > 0) {
    const r = Math.max(1, Math.round(bevel * size));
    const blurred = document.createElement('canvas');
    blurred.width = size;
    blurred.height = size;
    const bctx = blurred.getContext('2d');
    bctx.filter = `blur(${r}px)`;
    bctx.drawImage(canvas, 0, 0);
    return bctx.getImageData(0, 0, size, size);
  }

  return ctx.getImageData(0, 0, size, size);
};

// Convert mask -> dataURL for thumbnail / debug.
export const engravingToDataURL = (engravingImageData) => {
  if (!engravingImageData) return null;
  const c = document.createElement('canvas');
  c.width = engravingImageData.width;
  c.height = engravingImageData.height;
  c.getContext('2d').putImageData(engravingImageData, 0, 0);
  return c.toDataURL('image/png');
};
