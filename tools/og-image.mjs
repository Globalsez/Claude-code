/**
 * Renders tools/og-image.html to assets/img/og-cover.png (1200×630).
 *   node tools/og-image.mjs
 * Requires playwright (dev only — the site itself has no dependencies).
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
await pg.goto('file://' + path.join(dir, 'og-image.html'), { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);
await pg.screenshot({ path: path.join(dir, '..', 'assets/img/og-cover.png') });
await b.close();
console.log('wrote assets/img/og-cover.png');
