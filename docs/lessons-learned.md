# Captive portals: lessons learned

Practical, vendor-neutral knowledge accumulated from studying guest-network
captive portals on Linux. Nothing here is venue-specific; everything applies
to cafes, hotels, hostels, libraries, and conference networks.

## How devices detect a captive portal (the probe)

An OS considers itself "online" when a plain HTTP probe returns the expected
response. A captive portal intercepts the probe instead:

| Probe | Expected | Portal behavior |
|---|---|---|
| `http://connectivitycheck.gstatic.com/generate_204` (Android/Linux) | 204 | 302/307 redirect to login |
| `http://captive.apple.com/hotspot-detect.html` (Apple) | 200 "Success" | redirect, or HTML rewrite |
| `http://www.msftconnecttest.com/redirect` (Windows) | 200 | redirect to `connecttest.txt` chain |
| `http://detectportal.mozilla.com/success.txt` (Firefox) | `success` | redirect |

- A **204** means open internet; **302/307** means intercepted. Some portals
  answer **200** with an HTML login page injected — always check the body.
- Modern Linux via NetworkManager probes automatically; `curl -si` one of
  the URLs above gives you the same evidence manually.
- **RFC 8908 / RFC 8910 + DHCP option 114**: newer networks can advertise a
  captive-portal API URI directly (DHCP or router advertisement). Then there
  is no redirect game: the client fetches a JSON state document. Rare in
  cafes today, increasingly common in enterprise gear.
- **DNS-based portals** hijack DNS: every name resolves to the portal server.
  Test: `dig +short example.com` via DHCP resolver vs `@1.1.1.1` — different
  answers mean DNS interception. Note which one you are dealing with; it
  changes what "logged in" looks like.

## Flow archetypes you will meet

1. **Click-through**: a form with one button ("I agree"). One POST, no
   identity. Easiest to automate.
2. **Email/registration form**: POST with an email (sometimes name/room
   number). Identity = what you type + your MAC.
3. **Voucher/code**: pre-paid or printed access code. Automatable only if
   the code is reusable within its validity.
4. **Walled-garden API (JSON)**: login page is a JS app calling a JSON API
   (`/api/session`, `/api/login`). The browser flow and the raw HTTP flow
   differ — capture both if the first replay fails.
5. **WISPr XML**: an older protocol where the portal speaks an XML dialect
   (`WISPAccessGateway`, `LoginResult`). Automated clients POST credentials
   to a `Login` URL and parse the `ResponseCode`. Still common in
   hospitality gear.
6. **Per-device approval / captive-portal-app flows**: OS opens a
   mini-browser with special headers (`Captive-Portal: true` etc.). The
   portal may key on those headers; replaying without them can fail.

## What carries your logged-in state (session carriers)

- **Client MAC binding** — the most common. The portal marks your MAC as
  authenticated for N hours. Consequences: MAC randomization (default on
  many Linux setups via NetworkManager/iwd) makes you a "new device" every
  connect; pin the MAC for this SSID or accept re-login.
- **Cookies** — a session cookie after login; replay tools must keep a
  cookie jar.
- **Tokens** — query-parameter or header tokens (sometimes a JWT) minted at
  login. They expire; extract fresh ones each login rather than hardcoding.
- **Device-id cookies set BEFORE login** — some portals set an anonymous
  device cookie on the login page GET; the login POST must present it. This
  is why a replay that skips the initial GET fails.
- **IP + User-Agent combos** — rare, but some portals bind the session to
  both. Keep the replay's User-Agent identical to the captured one.

## Signals and lifecycle

- The **success signal** is usually the probe returning 204/expected-body
  again. Some portals redirect you to a "welcome/success" page — treat that
  page's URL as the `success.contains` marker in a profile.
- **Session lifetime hints**: terms text ("30 minutes free per day"),
  token expiry fields (JWT `exp`), or a status endpoint. Record what you
  observed, not what you assume.
- **Logout endpoint** (often `/logout`): useful for testing — log out, then
  verify your automation logs back in.
- **Walled gardens**: pre-login allowlists (the portal's own host, sometimes
  a payment processor or DNS). Requests to allowlisted hosts succeed before
  login — don't mistake them for internet access.

## HAR hygiene (why captures/ is gitignored)

A HAR of your own login contains: your password (in form posts), session
tokens (headers, cookies, JWTs), your email, sometimes your MAC. Treat it
like a password file:

- Keep it in `captures/` — gitignored by design.
- Share only `tools/redact-har.mjs` output, and review even that.
- Paste into an AI session only what `tools/analyze-har.mjs` prints (it
  redacts values) — never the raw file.

## Playwright capture notes

- `recordHar` with `mode: 'full'` captures request/response bodies —
  including `httpOnly` cookies (they appear in headers) and service-worker
  traffic.
- The HAR is flushed when the **context** closes, so the tool waits for
  ENTER first, then closes cleanly. Kill -9 = lost HAR.
- Start the recording, then navigate to a **probe URL**
  (`.../generate_204`) — this captures the interception redirect that a
  direct visit to the portal would miss.
- If the portal's login page is inside an iframe or a JS app, the HAR still
  shows the underlying XHRs — that is exactly the API you want for replay.

## Linux auto-login integration points

- **NetworkManager dispatcher** (`/etc/NetworkManager/dispatcher.d/`):
  scripts run on interface events; check probe, then run the profile login.
  Add a rate-limit stamp file; log outcomes.
- **systemd unit + timer**: poll every few minutes; simpler but less
  event-driven.
- **travelmate-style loops** (see prior-art): the OpenWrt world solved this
  with a daemon that detects captivity and runs a per-venue login script —
  same architecture works on a laptop with a shell loop.
- Keep credentials in a root-owned 0600 env file; never in the profile,
  never in the dispatcher script, never in git.
