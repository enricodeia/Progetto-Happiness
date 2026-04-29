// Metalab Design Test Builder — native Figma plugin
// Builds: tokens (variables + styles) + cover + token specimen + components + layouts.

figma.showUI(__html__, { width: 360, height: 520 });

// =========================================================
// Data
// =========================================================
const COLORS = {
  brand: {
    primary:       '#584dff',
    accent:        '#ff6060',
    'accent-deep': '#b60000',
  },
  ink: {
    pure:   '#000000',
    near:   '#171717',
    strong: '#313033',
    base:   '#48464a',
    muted:  '#545156',
    soft:   '#605d62',
    softer: '#79767a',
    faint:  '#938f94',
  },
  surface: {
    pure:    '#ffffff',
    near:    '#fffbff',
    warm:    '#f4eff4',
    paper:   '#edf1f5',
    tint:    '#e6e1e6',
    soft:    '#c7c7c7',
    mute:    '#cac5ca',
    line:    '#bababa',
    divider: '#aeaaae',
  },
  signal: {
    success: '#14a800',
    link:    '#007aff',
    deep:    '#100037',
  },
};

const SPACING = { 1:4, 2:8, 3:12, 4:16, 5:24, 6:32, 7:48, 8:64, 9:96, 10:128 };
const RADIUS  = { flat:0, hairline:2, card:8, 'card-lg':10, 'card-xl':30, block:50, pill:1000 };

// Type styles — { family, weight, size, lh%, ls% }
const TYPE = {
  hero:        { family:'PP Eiko',             weight:'Light',   size:220, lh: 90, ls:-4 },
  display:     { family:'PP Eiko',             weight:'Light',   size:120, lh: 90, ls:-4 },
  'display-sm':{ family:'PP Eiko',             weight:'Light',   size: 88, lh: 90, ls:-4 },
  h1:          { family:'PP Eiko',             weight:'Regular', size: 88, lh:116, ls:-2 },
  h2:          { family:'Basis Grotesque Pro', weight:'Medium',  size: 68, lh:116, ls:-2 },
  h3:          { family:'PP Eiko',             weight:'Regular', size: 40, lh:125, ls:-2 },
  h4:          { family:'Basis Grotesque Pro', weight:'Medium',  size: 32, lh:125, ls:-1.5 },
  lead:        { family:'Basis Grotesque Pro', weight:'Regular', size: 24, lh:140, ls:-1 },
  body:        { family:'Basis Grotesque Pro', weight:'Regular', size: 18, lh:150, ls:-1 },
  'body-sm':   { family:'Basis Grotesque Pro', weight:'Regular', size: 16, lh:150, ls:-1 },
  caption:     { family:'Basis Grotesque Pro', weight:'Regular', size: 14, lh:140, ls:-1 },
  eyebrow:     { family:'Basis Grotesque Pro', weight:'Medium',  size: 12, lh:100, ls: 1 },
};

const FALLBACK = {
  'PP Eiko':              { family:'Big Shoulders Display', weights:{ Light:'Light', Regular:'Regular' } },
  'Basis Grotesque Pro':  { family:'Inter',                  weights:{ Light:'Light', Regular:'Regular', Medium:'Medium' } },
};

// =========================================================
// Helpers
// =========================================================
function hexToRgb(hex) {
  const h = hex.replace('#','');
  return {
    r: parseInt(h.slice(0,2),16)/255,
    g: parseInt(h.slice(2,4),16)/255,
    b: parseInt(h.slice(4,6),16)/255,
  };
}
function solid(hex) { return [{ type:'SOLID', color: hexToRgb(hex) }]; }
function postLog(lines) { figma.ui.postMessage({ type:'log', text: lines.join('\n') }); }

let _fontCache = new Map();
async function loadFont(family, weight) {
  const key = `${family}__${weight}`;
  if (_fontCache.has(key)) return _fontCache.get(key);
  try {
    await figma.loadFontAsync({ family, style: weight });
    const f = { family, style: weight };
    _fontCache.set(key, f);
    return f;
  } catch (e) {
    const fb = FALLBACK[family];
    if (!fb) throw e;
    const fbStyle = fb.weights[weight] || 'Regular';
    await figma.loadFontAsync({ family: fb.family, style: fbStyle });
    const f = { family: fb.family, style: fbStyle };
    _fontCache.set(key, f);
    return f;
  }
}

async function makeText(content, presetName, color = '#171717') {
  const t = TYPE[presetName];
  const font = await loadFont(t.family, t.weight);
  const node = figma.createText();
  node.fontName = font;
  node.fontSize = t.size;
  node.lineHeight = { unit:'PERCENT', value: t.lh };
  node.letterSpacing = { unit:'PERCENT', value: t.ls };
  node.characters = presetName === 'eyebrow' ? content.toUpperCase() : content;
  node.fills = solid(color);
  if (presetName === 'eyebrow') node.textCase = 'UPPER';
  return node;
}

function getOrCreatePage(name) {
  let p = figma.root.children.find(c => c.name === name);
  if (!p) { p = figma.createPage(); p.name = name; }
  return p;
}

function rect(x, y, w, h, fillHex, radius = 0) {
  const r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(w, h);
  r.fills = solid(fillHex);
  if (radius > 0) r.cornerRadius = radius;
  return r;
}

async function preloadAllFonts() {
  const used = new Set();
  for (const k of Object.keys(TYPE)) {
    const t = TYPE[k];
    used.add(`${t.family}__${t.weight}`);
  }
  for (const key of used) {
    const [family, weight] = key.split('__');
    await loadFont(family, weight);
  }
}

// =========================================================
// Build steps
// =========================================================
async function buildTokens(log) {
  // Idempotent: skip if Metalab tokens already exist
  const existingCols = await figma.variables.getLocalVariableCollectionsAsync();
  const hasColors  = existingCols.some(c => c.name === 'Metalab / Colors');
  const hasNumbers = existingCols.some(c => c.name === 'Metalab / Numbers');

  if (!hasColors) {
    log.push('Creating color variables collection...');
    postLog(log);
    const colorCol = figma.variables.createVariableCollection('Metalab / Colors');
    const cMode = colorCol.modes[0].modeId;
    for (const group of Object.keys(COLORS)) {
      for (const name of Object.keys(COLORS[group])) {
        const v = figma.variables.createVariable(`${group}/${name}`, colorCol, 'COLOR');
        v.setValueForMode(cMode, hexToRgb(COLORS[group][name]));
      }
    }
  } else { log.push('• Color variables already exist — skipped'); postLog(log); }

  if (!hasNumbers) {
    log.push('Creating number variables...');
    postLog(log);
    const numCol = figma.variables.createVariableCollection('Metalab / Numbers');
    const nMode = numCol.modes[0].modeId;
    for (const k of Object.keys(SPACING)) {
      figma.variables.createVariable(`spacing/${k}`, numCol, 'FLOAT').setValueForMode(nMode, SPACING[k]);
    }
    for (const k of Object.keys(RADIUS)) {
      figma.variables.createVariable(`radius/${k}`, numCol, 'FLOAT').setValueForMode(nMode, RADIUS[k]);
    }
  } else { log.push('• Number variables already exist — skipped'); postLog(log); }

  // Paint styles: skip if any "brand/primary" paint style already exists
  const existingPaints = await figma.getLocalPaintStylesAsync();
  const hasPaint = existingPaints.some(s => s.name === 'brand/primary');
  if (!hasPaint) {
    log.push('Creating color paint styles...');
    postLog(log);
    for (const group of Object.keys(COLORS)) {
      for (const name of Object.keys(COLORS[group])) {
        const s = figma.createPaintStyle();
        s.name = `${group}/${name}`;
        s.paints = solid(COLORS[group][name]);
      }
    }
  } else { log.push('• Paint styles already exist — skipped'); postLog(log); }

  // Text styles: skip if "display" exists
  const existingTexts = await figma.getLocalTextStylesAsync();
  const hasText = existingTexts.some(s => s.name === 'display');
  if (hasText) {
    log.push('• Text styles already exist — skipped');
    postLog(log);
    log.push('✓ Tokens done');
    postLog(log);
    return;
  }
  log.push('Creating text styles...');
  postLog(log);
  for (const name of Object.keys(TYPE)) {
    const t = TYPE[name];
    const font = await loadFont(t.family, t.weight);
    const ts = figma.createTextStyle();
    ts.name = name;
    ts.fontName = font;
    ts.fontSize = t.size;
    ts.lineHeight = { unit:'PERCENT', value: t.lh };
    ts.letterSpacing = { unit:'PERCENT', value: t.ls };
    if (name === 'eyebrow') ts.textCase = 'UPPER';
  }
  log.push('✓ Tokens done');
  postLog(log);
}

async function buildCover(log) {
  log.push('Building Cover page...');
  postLog(log);
  const page = getOrCreatePage('Cover');
  await figma.setCurrentPageAsync(page);

  // background frame
  const frame = figma.createFrame();
  frame.name = 'Cover';
  frame.resize(1920, 1200);
  frame.fills = solid('#ffffff');
  page.appendChild(frame);

  // accent bar
  const bar = rect(120, 120, 80, 8, '#584dff');
  frame.appendChild(bar);

  const eyebrow = await makeText('Senior Brand Designer · Marketing', 'eyebrow', '#605d62');
  eyebrow.x = 120; eyebrow.y = 152;
  frame.appendChild(eyebrow);

  const title = await makeText('Metalab\nDesign Test', 'display', '#171717');
  title.x = 120; title.y = 200;
  frame.appendChild(title);

  const sub = await makeText('A response to the brief — by Enrico Deiana.', 'lead', '#605d62');
  sub.x = 120; sub.y = 720;
  frame.appendChild(sub);

  const meta = await makeText('2026', 'caption', '#938f94');
  meta.x = 120; meta.y = 1100;
  frame.appendChild(meta);

  log.push('✓ Cover done');
  postLog(log);
}

async function buildTokenSpecimen(log) {
  log.push('Building Tokens page...');
  postLog(log);
  const page = getOrCreatePage('Tokens');
  await figma.setCurrentPageAsync(page);

  const frame = figma.createFrame();
  frame.name = 'Tokens — specimen';
  frame.resize(1920, 2400);
  frame.fills = solid('#ffffff');
  page.appendChild(frame);

  // header
  const h = await makeText('Tokens', 'h2', '#171717');
  h.x = 120; h.y = 120;
  frame.appendChild(h);

  const sub = await makeText('Design tokens reverse-engineered from metalab.com', 'body', '#605d62');
  sub.x = 120; sub.y = 220;
  frame.appendChild(sub);

  // Color swatches
  let y = 320;
  const SW = 140, SH = 140, GAP = 24;
  for (const group of Object.keys(COLORS)) {
    const eb = await makeText(group, 'eyebrow', '#605d62');
    eb.x = 120; eb.y = y;
    frame.appendChild(eb);

    let x = 120;
    y += 40;
    for (const name of Object.keys(COLORS[group])) {
      const sw = rect(x, y, SW, SH, COLORS[group][name], 8);
      frame.appendChild(sw);
      const lab = await makeText(name, 'caption', '#171717');
      lab.x = x; lab.y = y + SH + 8;
      frame.appendChild(lab);
      const hex = await makeText(COLORS[group][name].toUpperCase(), 'caption', '#79767a');
      hex.x = x; hex.y = y + SH + 32;
      frame.appendChild(hex);
      x += SW + GAP;
    }
    y += SH + 90;
  }

  // Type specimen
  const tHead = await makeText('Type', 'h2', '#171717');
  tHead.x = 120; tHead.y = y + 40;
  frame.appendChild(tHead);

  y += 160;
  const samples = ['hero', 'display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'caption', 'eyebrow'];
  for (const name of samples) {
    const t = TYPE[name];
    const lab = await makeText(`${name}  ·  ${t.family} ${t.weight}  ·  ${t.size}px`, 'caption', '#79767a');
    lab.x = 120; lab.y = y;
    frame.appendChild(lab);

    const sample = await makeText('We make interfaces.', name, '#171717');
    sample.x = 120; sample.y = y + 30;
    frame.appendChild(sample);

    // height ≈ size * lh
    y += Math.max(t.size * (t.lh / 100), 60) + 70;
  }

  // resize frame to content
  frame.resize(1920, y + 200);

  log.push('✓ Tokens specimen done');
  postLog(log);
}

async function makeButton(label, variant) {
  const f = figma.createFrame();
  f.layoutMode = 'HORIZONTAL';
  f.primaryAxisAlignItems = 'CENTER';
  f.counterAxisAlignItems = 'CENTER';
  f.itemSpacing = 8;
  f.paddingLeft = 24; f.paddingRight = 24;
  f.paddingTop = 14; f.paddingBottom = 14;
  f.cornerRadius = 1000;
  f.name = `Button / ${variant}`;
  if (variant === 'primary') {
    f.fills = solid('#584dff');
  } else if (variant === 'secondary') {
    f.fills = solid('#ffffff');
    f.strokes = solid('#171717');
    f.strokeWeight = 1;
  } else {
    f.fills = [];
  }
  const t = await makeText(label, 'body-sm', variant === 'primary' ? '#ffffff' : '#171717');
  f.appendChild(t);
  return f;
}

async function makeCard() {
  const f = figma.createFrame();
  f.name = 'Card';
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = 16;
  f.paddingLeft = 0; f.paddingRight = 0; f.paddingTop = 0; f.paddingBottom = 24;
  f.cornerRadius = 10;
  f.fills = solid('#ffffff');
  f.resize(420, 580);

  const media = rect(0, 0, 420, 420, '#edf1f5', 8);
  f.appendChild(media);

  const eb = await makeText('Brand', 'eyebrow', '#605d62');
  f.appendChild(eb);

  const title = await makeText('A study in rigor', 'h4', '#171717');
  f.appendChild(title);

  const meta = await makeText('2026', 'caption', '#79767a');
  f.appendChild(meta);

  return f;
}

async function makeNavBar() {
  const f = figma.createFrame();
  f.name = 'NavBar';
  f.resize(1440, 80);
  f.layoutMode = 'HORIZONTAL';
  f.primaryAxisAlignItems = 'CENTER';
  f.counterAxisAlignItems = 'CENTER';
  f.primaryAxisSizingMode = 'FIXED';
  f.counterAxisSizingMode = 'FIXED';
  f.paddingLeft = 40; f.paddingRight = 40;
  f.itemSpacing = 48;
  f.fills = solid('#ffffff');

  const logo = await makeText('Metalab', 'h4', '#171717');
  f.appendChild(logo);

  const linksFrame = figma.createFrame();
  linksFrame.name = 'links';
  linksFrame.layoutMode = 'HORIZONTAL';
  linksFrame.itemSpacing = 32;
  linksFrame.fills = [];
  linksFrame.layoutGrow = 1;
  for (const lbl of ['What we do', 'About', 'Blog']) {
    const t = await makeText(lbl, 'body-sm', '#171717');
    linksFrame.appendChild(t);
  }
  f.appendChild(linksFrame);

  const cta = await makeButton('Say hey', 'primary');
  f.appendChild(cta);
  return f;
}

async function makeMarquee() {
  const f = figma.createFrame();
  f.name = 'Marquee';
  f.layoutMode = 'HORIZONTAL';
  f.itemSpacing = 48;
  f.paddingLeft = 0; f.paddingRight = 0; f.paddingTop = 24; f.paddingBottom = 24;
  f.fills = [];
  f.resize(2400, 180);
  for (let i = 0; i < 8; i++) {
    const t = await makeText('Metalab', 'h2', '#171717');
    f.appendChild(t);
  }
  f.clipsContent = true;
  return f;
}

async function makeHero() {
  const f = figma.createFrame();
  f.name = 'Hero';
  f.resize(1440, 800);
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = 32;
  f.paddingLeft = 80; f.paddingRight = 80; f.paddingTop = 160; f.paddingBottom = 80;
  f.fills = solid('#ffffff');

  const eb = await makeText('Hero section', 'eyebrow', '#605d62');
  f.appendChild(eb);

  const title = await makeText('We make\ninterfaces.', 'display', '#171717');
  f.appendChild(title);

  const body = await makeText('A Metalab-grade design system, ready to ship.', 'lead', '#605d62');
  f.appendChild(body);

  const ctaRow = figma.createFrame();
  ctaRow.name = 'cta';
  ctaRow.layoutMode = 'HORIZONTAL';
  ctaRow.itemSpacing = 16;
  ctaRow.fills = [];
  const a = await makeButton('Start building', 'primary');
  const b = await makeButton('View tokens', 'secondary');
  ctaRow.appendChild(a);
  ctaRow.appendChild(b);
  f.appendChild(ctaRow);

  return f;
}

async function makeFooter() {
  const f = figma.createFrame();
  f.name = 'Footer';
  f.resize(1440, 360);
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = 48;
  f.paddingLeft = 80; f.paddingRight = 80; f.paddingTop = 64; f.paddingBottom = 64;
  f.fills = solid('#ffffff');
  f.strokeTopWeight = 1;
  f.strokes = solid('#cac5ca');

  const wordmark = await makeText('Metalab · Metalab · Metalab', 'h2', '#171717');
  f.appendChild(wordmark);

  const cols = figma.createFrame();
  cols.layoutMode = 'HORIZONTAL';
  cols.itemSpacing = 96;
  cols.fills = [];
  cols.name = 'columns';
  for (const [label, items] of [
    ['Contact', ['contact@metalab.com']],
    ['Social',  ['Twitter', 'LinkedIn', 'Dribbble']],
    ['Sitemap', ['What we do', 'About', 'Blog', 'Contact']],
  ]) {
    const col = figma.createFrame();
    col.layoutMode = 'VERTICAL';
    col.itemSpacing = 8;
    col.fills = [];
    col.name = label;
    const eb = await makeText(label, 'eyebrow', '#605d62');
    col.appendChild(eb);
    for (const it of items) {
      const t = await makeText(it, 'body-sm', '#171717');
      col.appendChild(t);
    }
    cols.appendChild(col);
  }
  f.appendChild(cols);
  return f;
}

async function buildComponents(log) {
  log.push('Building Components page...');
  postLog(log);
  const page = getOrCreatePage('Components');
  await figma.setCurrentPageAsync(page);

  const frame = figma.createFrame();
  frame.name = 'Components — library';
  frame.resize(2400, 3200);
  frame.fills = solid('#fafafa');
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.paddingLeft = 120; frame.paddingRight = 120; frame.paddingTop = 120; frame.paddingBottom = 120;
  page.appendChild(frame);

  // Section: Buttons
  const sec1 = await makeText('Buttons', 'h3', '#171717');
  frame.appendChild(sec1);
  const btnRow = figma.createFrame();
  btnRow.layoutMode = 'HORIZONTAL';
  btnRow.itemSpacing = 16;
  btnRow.fills = [];
  btnRow.name = 'Buttons row';
  for (const v of ['primary', 'secondary', 'ghost']) {
    const b = await makeButton(v.charAt(0).toUpperCase() + v.slice(1), v);
    btnRow.appendChild(b);
  }
  frame.appendChild(btnRow);

  // Section: Cards
  const sec2 = await makeText('Cards', 'h3', '#171717');
  frame.appendChild(sec2);
  const cardRow = figma.createFrame();
  cardRow.layoutMode = 'HORIZONTAL';
  cardRow.itemSpacing = 24;
  cardRow.fills = [];
  cardRow.name = 'Cards row';
  for (let i = 0; i < 3; i++) {
    cardRow.appendChild(await makeCard());
  }
  frame.appendChild(cardRow);

  // Section: NavBar
  const sec3 = await makeText('NavBar', 'h3', '#171717');
  frame.appendChild(sec3);
  frame.appendChild(await makeNavBar());

  // Section: Hero
  const sec4 = await makeText('Hero', 'h3', '#171717');
  frame.appendChild(sec4);
  frame.appendChild(await makeHero());

  // Section: Marquee
  const sec5 = await makeText('Marquee', 'h3', '#171717');
  frame.appendChild(sec5);
  frame.appendChild(await makeMarquee());

  // Section: Footer
  const sec6 = await makeText('Footer', 'h3', '#171717');
  frame.appendChild(sec6);
  frame.appendChild(await makeFooter());

  log.push('✓ Components done');
  postLog(log);
}

async function buildLayouts(log) {
  log.push('Building Layouts page...');
  postLog(log);
  const page = getOrCreatePage('Layouts');
  await figma.setCurrentPageAsync(page);

  const archs = [
    { name: 'Editorial', desc: 'Asymmetric grid, big display moments, generous whitespace.' },
    { name: 'System',    desc: '12-col modular grid, repeating modules, dense information density.' },
    { name: 'Hero',      desc: 'Full-bleed hero, single focal point, minimal supporting copy.' },
  ];

  let yOffset = 0;
  for (const a of archs) {
    const frame = figma.createFrame();
    frame.name = `Layout · ${a.name}`;
    frame.resize(1440, 900);
    frame.x = 0; frame.y = yOffset;
    frame.fills = solid('#ffffff');
    page.appendChild(frame);

    const eb = await makeText('Archetype', 'eyebrow', '#605d62');
    eb.x = 80; eb.y = 80;
    frame.appendChild(eb);

    const title = await makeText(a.name, 'h1', '#171717');
    title.x = 80; title.y = 120;
    frame.appendChild(title);

    const desc = await makeText(a.desc, 'lead', '#605d62');
    desc.x = 80; desc.y = 260;
    desc.resize(1000, 80);
    frame.appendChild(desc);

    // grid skeleton
    if (a.name === 'Editorial') {
      // asymmetric: 2 wide blocks + 3 narrow
      frame.appendChild(rect(80, 380, 800, 400, '#edf1f5', 8));
      frame.appendChild(rect(900, 380, 460, 180, '#f4eff4', 8));
      frame.appendChild(rect(900, 580, 220, 200, '#e6e1e6', 8));
      frame.appendChild(rect(1140, 580, 220, 200, '#e6e1e6', 8));
    } else if (a.name === 'System') {
      // 12-col modular
      const cols = 4, rows = 2, w = 320, h = 180, gap = 24;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          frame.appendChild(rect(80 + c * (w + gap), 380 + r * (h + gap), w, h, '#edf1f5', 8));
        }
      }
    } else if (a.name === 'Hero') {
      // single big block + tiny meta
      frame.appendChild(rect(80, 380, 1280, 440, '#171717', 16));
      const overlay = await makeText('A single focal moment.', 'h2', '#ffffff');
      overlay.x = 120; overlay.y = 540;
      frame.appendChild(overlay);
    }

    yOffset += 1000;
  }

  log.push('✓ Layouts done');
  postLog(log);
}

// =========================================================
// Orchestrator
// =========================================================
async function build(opts) {
  const log = [];
  const push = (s) => { log.push(s); postLog(log); };

  push('Preloading fonts...');
  await preloadAllFonts();
  push('✓ Fonts ready');

  if (opts.tokens)     await buildTokens(log);
  if (opts.cover)      await buildCover(log);
  if (opts.tokenpage)  await buildTokenSpecimen(log);
  if (opts.components) await buildComponents(log);
  if (opts.layouts)    await buildLayouts(log);

  push('');
  push('All done. Pages created on the left. Check Local styles + variables panels.');
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'build') {
    try { await build(msg.opts); }
    catch (e) { postLog(['Error: ' + e.message, e.stack || '']); }
  }
  if (msg.type === 'close') figma.closePlugin();
};
