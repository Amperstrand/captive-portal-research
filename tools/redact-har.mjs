#!/usr/bin/env node
// redact-har.mjs — produce a sanitized copy of a HAR file.
//
// Removes or masks: cookie values, authorization headers, password-like form
// values, JWT-shaped tokens, email addresses, and MAC addresses. Writes
// <name>.redacted.har next to the original and prints a redaction summary.
//
// Usage: node tools/redact-har.mjs captures/session.har
//   ->   captures/session.redacted.har

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/redact-har.mjs <capture.har>');
  process.exit(2);
}

const counts = Object.create(null);
const bump = (k) => (counts[k] = (counts[k] ?? 0) + 1);

const SENSITIVE = /pass|pwd|\bpw\b|secret|token|auth|credential|\bpin\b|otp/i;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAC = /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b|\b[0-9A-Fa-f]{2}(?:%3A[0-9A-Fa-f]{2}){5}\b/gi;

const mask = (s) => String(s).replace(JWT, '<JWT>').replace(EMAIL, '<EMAIL>').replace(MAC, '<MAC>');

let har;
try {
  har = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`cannot read HAR: ${err.message}`);
  process.exit(1);
}

const entries = har.log?.entries ?? [];
for (const e of entries) {
  e.request.url = mask(e.request.url);
  for (const h of e.request?.headers ?? []) {
    if (/^(authorization|cookie)$/i.test(h.name)) {
      h.value = '<REDACTED>';
      bump(`${h.name.toLowerCase()} headers`);
    }
    h.value = mask(h.value);
  }
  for (const h of e.response?.headers ?? []) {
    if (h.name.toLowerCase() === 'set-cookie') {
      const eq = h.value.indexOf('=');
      const semi = h.value.indexOf(';');
      h.value = h.value.slice(0, eq + 1) + '<REDACTED>' + (semi >= 0 ? h.value.slice(semi) : '');
      bump('set-cookie values');
    } else {
      h.value = mask(h.value);
    }
  }
  const params = e.request?.postData?.params ?? [];
  for (const p of params) {
    if (SENSITIVE.test(p.name)) {
      p.value = '<REDACTED>';
      bump('password-like form values');
    } else if (p.value != null) {
      p.value = mask(p.value);
    }
  }
  const text = e.request?.postData?.text;
  if (text) e.request.postData.text = mask(text);
  const body = e.response?.content?.text;
  if (body) e.response.content.text = mask(body);
}

const out = file.replace(/\.har$/i, '') + '.redacted.har';
writeFileSync(out, JSON.stringify(har, null, 2));

console.log(`wrote ${out}`);
for (const [k, v] of Object.entries(counts)) console.log(`  redacted ${v}x ${k}`);
if (Object.keys(counts).length === 0) console.log('  (nothing sensitive found — still double-check before sharing)');
