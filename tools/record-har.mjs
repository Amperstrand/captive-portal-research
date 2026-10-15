#!/usr/bin/env node
// record-har.mjs — capture a captive-portal login session as a HAR file.
//
// Opens a headed Chromium window, starts HAR recording, navigates to a probe
// URL (the captive portal usually intercepts this and redirects to its login
// page), and waits while you complete the venue login. Press ENTER in the
// terminal when you are done; the HAR is flushed on close.
//
// Usage:
//   node tools/record-har.mjs [--url http://...] [--out captures/venue.har]
//
// Requires: npm i playwright-core && npx playwright install chromium

import { chromium } from 'playwright-core';
import readline from 'node:readline/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function flag(name, dflt) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}

const url = flag('--url', 'http://connectivitycheck.gstatic.com/generate_204');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
const out = flag('--out', `captures/session-${stamp}.har`);
mkdirSync(path.dirname(out), { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: false });
} catch (err) {
  if (/playwright|Executable|browserType/i.test(String(err))) {
    console.error('Chromium is not installed for playwright. Run:\n  npx playwright install chromium');
    process.exit(1);
  }
  throw err;
}

const context = await browser.newContext({ recordHar: { path: out, mode: 'full' } });
const page = await context.newPage();

console.log(`Recording HAR -> ${out}`);
console.log(`Opening ${url} — the portal should intercept and redirect...`);
await page.goto(url, { waitUntil: 'commit', timeout: 20000 }).catch(() => {});
console.log('Complete the venue login in the browser window.');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('Press ENTER here once you are logged in (or to stop recording)... ');
rl.close();

await context.close(); // flushes the HAR to disk
await browser.close();

console.log(`Saved: ${out}`);
console.log(`Next: node tools/analyze-har.mjs ${out}`);
