# Prompt 40 — automate the re-login

Run once you are confident in the profile (prompt 30). Paste into `opencode`.

```
VENUE: <name>
SSID: <guest network name>
Profile: profiles/<venue-slug>.json
Guardrails: test against the LIVE portal only with my explicit confirmation
for each run; never loop faster than one attempt per 30 seconds; stop after
3 failed attempts and report instead of retrying.

Task: make my laptop log itself back in automatically on this venue.

1. One-shot test: ask me for the identity to use (username/email/voucher),
   take the password from the PORTAL_PASS env I will export — never echo it:
     PORTAL_PASS=... node tools/login.mjs profiles/<venue-slug>.json --user <id>
   Show me the command first and WAIT for my go-ahead (it POSTs my
   credentials to the portal). On failure, print which step failed and the
   status/redirect received — do not auto-retry.
2. Verify open internet after a successful run:
   `curl -si http://connectivitycheck.gstatic.com/generate_204` -> 204.
3. Install the NetworkManager dispatcher hook (ask before writing to /etc):
   /etc/NetworkManager/dispatcher.d/90-captive-portal-login.sh that, on
   connectivity change for this SSID, checks
   connectivitycheck.gstatic.com/generate_204 and, if not 204, runs
   tools/login.mjs with the profile (identity from a root-owned 0600 env
   file, NEVER committed). Include a simple per-SSId log line to
   /var/log/captive-portal-login.log and a 60s rate limit (touch a stamp
   file).
4. Document the limits in captures/<venue-slug>-automation.md:
   - CAPTCHA / one-time-code portals stay manual
   - MAC-randomized Wi-Fi breaks MAC-bound sessions (pin this SSID or
     accept re-login)
   - session lifetimes: re-login happens when the portal says so, not on
     a timer
   - portal changes break the profile — re-run prompts 10-30 to refresh
5. Final report: what was installed, how to test it (disconnect/reconnect
   Wi-Fi), and how to uninstall (delete the dispatcher file).
```
