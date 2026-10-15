# Prompt 20 — analyze how the portal works

Run after the capture (prompt 10). Paste into `opencode`.

```
VENUE: <name>
SSID: <guest network name>
Capture: captures/<venue-slug>.har (plus -notes.md from prompt 10).
Guardrails unchanged: authorized research, own device, artifacts stay in
captures/, no raw secrets in this session — analysis output must be redacted.

Task: explain how this venue's captive portal actually works.

1. Run `node tools/analyze-har.mjs captures/<venue-slug>.har` and study the
   output (timeline, redirect chain, form fields, cookies, archetype).
2. Write captures/<venue-slug>-analysis.md explaining, in order:
   - DETECTION: how clients detect the portal (probe intercept? DNS? DHCP?)
   - REDIRECT CHAIN: probe URL -> ... -> login page, host by host
   - AUTHENTICATION: endpoint, method, every parameter name (values redacted)
     — email form? voucher code? button-only click-through? JSON API?
   - SESSION: what carries the logged-in state afterward (cookie names,
     token, client MAC binding?) and what the success signal looks like
     (which request returns 200/open-internet, is there a redirect out?)
   - LOGOUT: any logout endpoint seen or hinted
   - LIFETIME: any hints about session duration (terms text, expiry fields)
   - CLIENT IDENTITY: what identifies my device (MAC, device-id cookie,
     IP, browser fingerprint)
3. Close the analysis with a one-paragraph "how to automate MY re-login"
   hypothesis, and list what is still unknown.
4. Keep every credential/cookie/token VALUE out of the analysis file —
   names only. If you need to quote a value, redact it.

Do not write the profile yet (prompt 30 does that).
```
