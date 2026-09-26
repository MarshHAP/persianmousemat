// Full-page screenshots of the local preview at desktop and mobile widths.
// Usage: node preview/screenshot.mjs [path] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const pagePath = process.argv[2] || '/products/persian-mouse-mat';
const outDir = process.argv[3] || 'screenshots';
const base = process.env.PREVIEW_URL || 'http://localhost:4000';
fs.mkdirSync(outDir, { recursive: true });

const launch = { args: [] };
if (fs.existsSync('/opt/pw-browsers/chromium')) launch.executablePath = '/opt/pw-browsers/chromium';
// Behind a TLS-intercepting proxy (e.g. cloud sandboxes): route through it and trust its CA by SPKI hash.
if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
if (process.env.PW_TRUST_SPKI) launch.args.push(`--ignore-certificate-errors-spki-list=${process.env.PW_TRUST_SPKI}`);

const browser = await chromium.launch(launch);
for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (e) => console.error(`[${name}] page error:`, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[${name}] console:`, m.text(), m.location().url); });
  await page.goto(base + pagePath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const slug = pagePath.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'home';
  await page.screenshot({ path: `${outDir}/${slug}-${name}.png`, fullPage: true });
  console.log(`${outDir}/${slug}-${name}.png`, await page.evaluate(() => document.body.scrollHeight));
  await page.close();
}
await browser.close();
