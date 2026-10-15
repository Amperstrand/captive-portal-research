# Prompt 30 — write the venue profile

Run after the analysis (prompt 20). Paste into `opencode`.

```
VENUE: <name>
SSID: <guest network name>
Inputs: captures/<venue-slug>-analysis.md (+ the HAR if you need to re-check
a URL or parameter name — names only, never values).

Task: write profiles/<venue-slug>.json — a machine-readable profile that
tools/login.mjs can replay later to log MY device back in.

Profile schema (keep it minimal):
{
  "id": "<venue-slug>",
  "match": { "ssid": "<exact SSID>", "host_regex": "<portal host, e.g. \\.portal\\.venue\\.com$>" },
  "steps": [
    { "method": "GET|POST", "url": "...",
      "form": { "field": "{{user}}|{{pass}}|literal" },     // or "json": {...}
      "extract": { "name": "json:key | header:Name | body:regex" } }
  ],
  "success": { "status": 200, "contains": "optional body marker" },
  "notes": "human-readable caveats"
}

Rules:
1. Only steps that are needed for MY login. No credential values in the
   profile — {{user}} and {{pass}} placeholders only.
2. Every step URL must match a URL you actually saw in the HAR/analysis.
3. Validate: `node -e "JSON.parse(require('fs').readFileSync('profiles/<venue-slug>.json'))"`.
4. Dry-run review: print each step's method/url/fields and walk me through
   why each is needed, referencing the analysis. Ask me to confirm before
   you save the file.
5. If the flow cannot be automated (CAPTCHA, one-time code per visit,
   per-device approval), say so plainly in notes and stop — manual login
   is a valid outcome.

profiles/ is gitignored: this file describes a real venue's portal, so it
stays on this laptop.
```
