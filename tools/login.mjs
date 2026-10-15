#!/usr/bin/env node
// login.mjs — replay a venue profile to log in to a captive portal.
//
// Runs the profile's HTTP steps with a simple cookie jar, substituting
// {{user}}/{{pass}} (user via --user, password via PORTAL_PASS env or an
// interactive prompt — never store credentials in the profile).
//
// Usage:
//   PORTAL_PASS=... node tools/login.mjs profiles/cafe.json --user me@example.com
//
// Profile step shape:
//   { "method": "POST", "url": "http://portal/login",
//     "form": {"email": "{{user}}", "password": "{{pass}}"},
//     "extract": {"token": "json:auth_token"} }
// extract sources: json:<key> | header:<Name> | body:<regex with capture group>

import readline from 'node:readline/promises';

const args = process.argv.slice(2);
const profilePath = args.find((a) => !a.startsWith('--'));
const userArg = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;
if (!profilePath) {
  console.error('usage: node tools/login.mjs profiles/<venue>.json --user <id>  (password: PORTAL_PASS or prompt)');
  process.exit(2);
}

const { readFileSync } = await import('node:fs');
let profile;
try {
  profile = JSON.parse(readFileSync(profilePath, 'utf8'));
} catch (err) {
  console.error(`cannot read profile: ${err.message}`);
  process.exit(2);
}

const user = userArg ?? profile.match?.ssid ?? '';
let pass = process.env.PORTAL_PASS ?? '';
if (!pass) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  pass = await rl.question('portal password: ');
  rl.close();
}

const vars = { user, pass };
const sub = (s) => String(s).replace(/\{\{(user|pass)\}\}/g, (_, k) => vars[k]);

const jar = new Map(); // name -> value (portals are usually single-host)
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

function extract(source, res, body) {
  const [kind, arg] = [source.slice(0, source.indexOf(':')), source.slice(source.indexOf(':') + 1)];
  if (kind === 'json') {
    try { return JSON.parse(body)[arg]; } catch { return undefined; }
  }
  if (kind === 'header') return res.headers.get(arg) ?? undefined;
  if (kind === 'body') return body.match(new RegExp(arg))?.[1];
  return undefined;
}

let last = { status: 0, body: '' };
for (const [i, step] of (profile.steps ?? []).entries()) {
  const url = sub(step.url);
  const init = { method: step.method ?? 'GET', redirect: 'manual', headers: {} };
  if (jar.size) init.headers.cookie = cookieHeader();
  if (step.form) {
    init.headers['content-type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(Object.fromEntries(
      Object.entries(step.form).map(([k, v]) => [k, sub(v)]))).toString();
  } else if (step.json) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(step.json, (k, v) => typeof v === 'string' ? sub(v) : v);
  }

  const res = await fetch(url, init);
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  last = { status: res.status, body: await res.text(), location: res.headers.get('location') ?? '' };
  console.log(`step ${i + 1}: ${init.method} ${url} -> ${res.status}${last.location ? ` (-> ${last.location})` : ''}`);

  for (const [name, source] of Object.entries(step.extract ?? {})) {
    const v = extract(source, last, last.body);
    if (v != null) { vars[name] = v; console.log(`  extracted ${name}`); }
  }
}

const want = profile.success ?? {};
const okStatus = want.status ? last.status === want.status : true;
const okContains = want.contains ? last.body.includes(want.contains) : true;
console.log(`final status ${last.status}`);
process.exit(okStatus && okContains ? 0 : 1);
