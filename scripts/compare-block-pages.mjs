// Prompt 17, punto 6: confronto visivo tra le pagine di oggi e quelle a blocchi convertite.
// Fa uno screenshot a tutta pagina di ogni coppia, su computer (1280) e telefono (390), e li salva
// affiancati in un'unica immagine per coppia, da guardare a occhio.
//
//   BASE=http://localhost:3302 OUT=dev/screenshots node scripts/compare-block-pages.mjs
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright'));
}

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? 'dev/screenshots';
const PAIRS = [
  ['zuccaland', '/zuccaland', '/zuccaland/2026'],
  ['assaggia-2026', '/assaggia-e-passeggia/edizione-2026', '/assaggia-e-passeggia/2026'],
];
const WIDTHS = [1280, 390];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [name, before, after] of PAIRS) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const shots = [];
    for (const path of [before, after]) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      // Il popup del rinvio di Zuccaland copre la pagina: si chiude come farebbe un visitatore.
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(800);
      shots.push((await page.screenshot({ fullPage: true })).toString('base64'));
    }
    // Affiancate in una pagina vuota.
    await page.setContent(`<body style="margin:0;display:flex;gap:16px;background:#999;align-items:flex-start">${shots.map((s) => `<img src="data:image/png;base64,${s}" style="width:${width}px">`).join('')}</body>`);
    await page.setViewportSize({ width: width * 2 + 16, height: 900 });
    await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
    console.log(`${OUT}/${name}-${width}.png  (${before} | ${after})`);
    await page.close();
  }
}
await browser.close();
