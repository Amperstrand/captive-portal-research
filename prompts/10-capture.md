# Prompt 10 — capture the venue login flow

Do this while connected to the venue Wi-Fi but BEFORE logging in. Paste into `opencode`.

```
VENUE: <name>
SSID: <guest network name>
I am connected to the venue guest Wi-Fi and have NOT logged in yet.
Same guardrails as before: authorized research, own device + credentials,
observe-first, artifacts only in captures/ (gitignored), no raw secrets
pasted into the session.

Task: capture everything about the portal's login flow.

1. Probe evidence first, from the shell (this is the OS's view):
   - `curl -si --max-time 10 http://connectivitycheck.gstatic.com/generate_204`
     — note the status line (204 = open internet, 302/307 = portal intercept)
     and the Location header.
   - Repeat with `http://captive.apple.com/hotspot-detect.html` and
     `http://www.msftconnecttest.com/redirect` if the first is inconclusive.
2. DNS oddities: `resolvectl status` (which resolver, any weirdness),
   and `dig +short captive.apple.com` vs `dig +short example.com @1.1.1.1`
   — a portal that hijacks DNS answers differently.
3. The main capture — run it and WAIT for me, I must complete the login
   manually in the browser window:
   `node tools/record-har.mjs --out captures/<venue-slug>.har`
   Tell me: "complete the login in the Chromium window, then press ENTER
   in the terminal". Do not proceed until the file exists.
4. Save a short evidence note to captures/<venue-slug>-notes.md: probe
   status + Location, DNS observations, the login page URL you saw, and
   anything the venue states on the login page (terms, time limits).
5. Confirm captures/<venue-slug>.har is valid JSON and report its size.

Do not analyze the HAR yet (that is prompt 20). Do not commit anything —
captures/ is gitignored on purpose.
```
