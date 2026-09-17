// Vendored VERBATIM from projects/design-component-library/src/lib/layout.js
// Shared placement maths so the live component and the exported standalone
// build stay in perfect sync. Returns { x, y, z, ry } for an item index.

export function placeItem(shape, idx, total, p) {
  const {
    perRow,
    rows,
    radius,
    rowGap,
    curve,
    spiralTurns,
    spiralRise,
    spiralGrow,
  } = p;

  if (shape === "ring") {
    const a = (idx / total) * Math.PI * 2;
    return { x: Math.sin(a) * radius, y: 0, z: Math.cos(a) * radius, ry: a };
  }

  if (shape === "spiral") {
    const t = total > 1 ? idx / (total - 1) : 0;
    const a = t * Math.PI * 2 * spiralTurns;
    const r = radius + t * spiralGrow;
    const y = (t - 0.5) * spiralRise;
    return { x: Math.sin(a) * r, y, z: Math.cos(a) * r, ry: a };
  }

  if (shape === "sphere") {
    // Fibonacci sphere — even distribution.
    const gold = Math.PI * (3 - Math.sqrt(5));
    const yN = total > 1 ? 1 - (idx / (total - 1)) * 2 : 0; // 1 → -1
    const rAtY = Math.sqrt(Math.max(0, 1 - yN * yN));
    const a = gold * idx;
    return {
      x: Math.cos(a) * rAtY * radius,
      y: yN * radius,
      z: Math.sin(a) * rAtY * radius,
      ry: a,
    };
  }

  // cylinder + wave: column around a circle, rows stacked vertically
  const row = Math.floor(idx / perRow);
  const col = idx % perRow;
  const stagger = (row % 2) * (Math.PI / perRow);
  const a = (col / perRow) * Math.PI * 2 + stagger;
  const yCenter = (rows - 1) / 2;
  let y = (yCenter - row) * rowGap;
  if (shape === "wave") y += Math.sin(a * 2) * rowGap * 0.4;
  const r = radius + y * curve;
  return { x: Math.sin(a) * r, y, z: Math.cos(a) * r, ry: a };
}

export function itemCount(shape, perRow, rows, count) {
  if (shape === "spiral" || shape === "sphere" || shape === "ring") return count;
  return Math.min(perRow * rows, count);
}
