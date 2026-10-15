#!/usr/bin/env node
// analyze-har.mjs — offline analysis of a captured HAR file.
//
// Pure local analysis, zero network activity. Prints the request timeline,
// redirect chain, form fields (values redacted), cookie names, auth-ish
// headers, likely identity-bearing query parameters, and a best-guess flow
// archetype: form-post | wispr | json-api | redirect-only | click-through.
//
// Usage: node tools/analyze-har.mjs captures/session.har

import { readFileSync } from 'node:fs';

const SENSITIVE = /pass|pwd|\bpw\b|secret|token|auth|credential|\bpin\b|otp/i;
const IDENTITY_PARAM = /mac|client|id$|id_|session|token|redirect|callback|ip$/i;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAC_RE = /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b|\b[0-9A-Fa-f]{2}(?:%3A[0-9A-Fa-f]{2}){5}\b/gi;
const mask = (s) =>
  String(s).replace(JWT_RE, '<JWT>').replace(EMAIL_RE, '<EMAIL>').replace(MAC_RE, '<MAC>');

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/analyze-har.mjs <capture.har>');
  process.exit(2);
}

let har;
try {
  har = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`cannot read HAR: ${err.message}`);
  process.exit(1);
}

const entries = har.log?.entries ?? [];
if (entries.length === 0) {
  console.error('no entries in HAR');
  process.exit(1);
}

const redact = (name, value) =>
  SENSITIVE.test(name) ? '<REDACTED>' : mask(value).slice(0, 48);

console.log(`== ${file}: ${entries.length} requests ==\n`);

console.log('-- timeline --');
for (const e of entries) {
  const r = e.request ?? {};
  const s = e.response ?? {};
  const host = new URL(r.url ?? 'http://x/').host;
  const p = new URL(r.url ?? 'http://x/').pathname;
  const size = (e.response?._transferSize ?? s.bodySize ?? 0) || 0;
  console.log(`${String(r.method ?? '?').padEnd(4)} ${String(s.status ?? '?').padEnd(4)} ${host}${p}  (${size}B)`);
}

console.log('\n-- redirect chain --');
for (const e of entries) {
  const st = e.response?.status ?? 0;
  if ([301, 302, 303, 307, 308].includes(st)) {
    const loc = (e.response?.headers ?? []).find((h) => h.name.toLowerCase() === 'location');
    console.log(`${st} ${mask(e.request?.url)}\n   -> ${loc ? mask(loc.value) : '(no location header)'}`);
  }
}

console.log('\n-- form fields (values redacted) --');
let forms = 0;
for (const e of entries) {
  const params = e.request?.postData?.params ?? [];
  if (params.length === 0) continue;
  forms++;
  console.log(`POST ${e.request.url}`);
  for (const p of params) console.log(`   ${p.name} = ${redact(p.name, p.value ?? '')}`);
  const text = e.request?.postData?.text ?? '';
  if (!params.length && text) console.log(`   (raw body, ${text.length}B)`);
}

console.log('\n-- cookies set by the portal --');
for (const e of entries) {
  for (const h of e.response?.headers ?? []) {
    if (h.name.toLowerCase() !== 'set-cookie') continue;
    const [pair, ...attrs] = h.value.split(';');
    const name = pair.split('=')[0].trim();
    console.log(`${name}  [${attrs.map((a) => a.trim().split('=')[0]).join(', ')}]`);
  }
}

console.log('\n-- auth-ish request headers --');
for (const e of entries) {
  for (const h of e.request?.headers ?? []) {
    if (/^(authorization|x-.*-token|api-key|cookie)$/i.test(h.name)) {
      console.log(`${h.name}: <${String(h.value).length}B value, redacted>`);
    }
  }
}

console.log('\n-- identity-bearing query parameters (names only) --');
const paramNames = new Set();
for (const e of entries) {
  const u = new URL(e.request?.url ?? 'http://x/');
  for (const [k] of u.searchParams) if (IDENTITY_PARAM.test(k)) paramNames.add(k);
}
for (const n of paramNames) console.log(n);

console.log('\n-- archetype guess --');
const posts = entries.filter((e) => e.request?.method === 'POST');
const sawWispr = entries.some((e) => /WISPr|LoginResult|WISPAccessGateway/i.test(String(e.response?.content?.text ?? '')));
const sawJson = entries.some((e) =>
  /json/i.test(e.response?.content?.mimeType ?? '') && /api\//i.test(e.request?.url ?? ''));
if (sawWispr) console.log('wispr');
else if (sawJson && posts.length) console.log('json-api');
else if (posts.length && forms) console.log('form-post');
else if (posts.length) console.log('click-through (button/POST only)');
else console.log('redirect-only' + (entries.length <= 3 ? ' (few requests — login may not have been captured)' : ''));

console.log('\nReminder: this HAR contains your credentials. Keep it in captures/ (gitignored).');
console.log('To share an excerpt: node tools/redact-har.mjs ' + file);
