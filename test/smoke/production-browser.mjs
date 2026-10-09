// Browser smoke on the public site. Navigation only; no account or mutation flow.
import { chromium } from '../e2e/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';

const origin = (process.env.COURSEHUB_FRONTEND_URL || 'https://group36-coursehub.vercel.app').replace(/\/$/, '');
const output = process.argv[2];
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const page = await browser.newPage();
const cases = [];
async function check(id, action, heading) {
  try {
    const response = await action();
    const visible = await page.getByRole('heading', { name: heading }).isVisible();
    cases.push({ id, result: response?.status() === 200 && visible ? 'pass' : 'fail', status: response?.status(), headingVisible: visible, url: page.url() });
  } catch (error) {
    cases.push({ id, result: 'blocked', evidence: `${error.name}: ${error.message}` });
  }
}
try {
  await check('home-browser', () => page.goto(origin, { waitUntil: 'networkidle', timeout: 120_000 }), 'คอร์สที่ใช่ เริ่มต้นได้ที่นี่');
  await check('match-direct-browser', () => page.goto(`${origin}/match`, { waitUntil: 'networkidle', timeout: 120_000 }), 'หาคอร์สที่เข้ากับคุณ');
  await check('match-refresh-browser', () => page.reload({ waitUntil: 'networkidle', timeout: 120_000 }), 'หาคอร์สที่เข้ากับคุณ');
} finally { await browser.close(); }
const report = { observedAt: new Date().toISOString(), origin, browser: `Chromium ${browserVersion}`, cases };
const encoded = `${JSON.stringify(report, null, 2)}\n`;
if (output) await writeFile(output, encoded);
process.stdout.write(encoded);
process.exitCode = cases.some((item) => item.result !== 'pass') ? 1 : 0;
