// Shoots a real thumbnail for every library preset, straight off the page.
//
//   npm run dev            (in another terminal)
//   npm run library:shots
//
// Writes `public/preset-previews/<slug>.webp` — the same framing region the
// shelf shows, with THIS page's portraits on THIS page's paper, so the
// thumbnails are what you will actually get rather than the webkit panel's
// own previews (Metalab case media on black).
//
// It drives the page's own `tower.snapshot()`, which grabs the frame inside
// the ticker, so what lands in the file is exactly what was on screen.

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.URL || "http://localhost:5199/teach.html";
const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, "../public/preset-previews");
// Settle time per preset: the textures are cached after the first build, but
// the staggered fade-in still has to finish or the shot catches it half-lit.
const SETTLE = Number(process.env.SETTLE || 1700);

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1500,1000", "--enable-webgl", "--use-gl=angle"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 2 });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));

// A saved session would change the framing under us — shoot from the defaults.
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.evaluate(() => {
  try {
    localStorage.removeItem("tch.live.v1");
  } catch {
    /* storage off — nothing to clear */
  }
});
await page.goto(URL, { waitUntil: "networkidle2", timeout: 45000 });
await page.waitForFunction("window.__tch && window.__tch.state.cards > 0", { timeout: 20000 });
await page.evaluate(() => {
  window.__tch.setClean(true);
  window.__tch.cfg.hero.reveal = false;
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const library = await page.evaluate(() => window.__tch.shelf.library.map((e) => e.slug));

let n = 0;
for (const slug of library) {
  const ok = await page.evaluate((s) => {
    const e = window.__tch.shelf.library.find((x) => x.slug === s);
    if (!e) return false;
    window.__tch.applyLibrary(e.config);
    return true;
  }, slug);
  if (!ok) {
    console.log(`  ?? ${slug} — not in the library`);
    continue;
  }
  await wait(SETTLE);
  const url = await page.evaluate(() => window.__tch.tower.snapshot(536, 316));
  if (!url || !url.startsWith("data:image")) {
    console.log(`  !! ${slug} — no frame came back`);
    continue;
  }
  const b64 = url.slice(url.indexOf(",") + 1);
  fs.writeFileSync(path.join(OUT, `${slug}.webp`), Buffer.from(b64, "base64"));
  n += 1;
  console.log(`  ok ${slug}`);
}

await browser.close();
console.log(`\n${n}/${library.length} previews → public/preset-previews/`);
if (errors.length) {
  console.log("errors:\n" + errors.slice(0, 5).join("\n"));
  process.exit(1);
}
process.exit(n === library.length ? 0 : 1);
