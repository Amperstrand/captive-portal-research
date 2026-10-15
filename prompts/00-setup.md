# Prompt 00 — setup & smoke test

Paste this into `opencode` in the repository root. Fill in the context block first.

```
VENUE: <the cafe/venue you are researching>
SSID: <the guest network name>
LAPTOP: Linux laptop, I am a paying guest of this venue and I am researching
its guest Wi-Fi captive portal for my own connectivity, with authorization.

You are helping me with authorized captive-portal research on my own device
with my own credentials. Guardrails for this whole session: observe first
(GET before POST), ask me before submitting anything with real credentials,
keep every artifact inside captures/ or profiles/ (both gitignored), and
never paste raw secrets into this session — use the redacted tool output.

Task: verify the toolchain and prepare the work directories.

1. Check node >= 20 (`node --version`), that `npx playwright --version`
   works, and that a chromium is installed for playwright
   (`npx playwright install chromium` if not — tell me before running it,
   it downloads ~150 MB).
2. If this repo has no node_modules yet: `npm init -y` (defaults are fine)
   and `npm i playwright-core`.
3. Create captures/ and profiles/ if they do not exist (they are gitignored;
   a .gitkeep keeps the dirs in git).
4. Smoke test the recorder WITHOUT the venue network:
   `node tools/record-har.mjs --url http://example.com --out captures/smoke.har`
   — let the page load, press ENTER, confirm captures/smoke.har exists and
   is valid JSON, then delete it.
5. Report: what passed, what is missing, and the exact command I will run
   for the real capture (prompts/10-capture.md) once I am on the venue Wi-Fi.
```
