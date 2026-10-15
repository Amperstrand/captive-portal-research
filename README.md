# captive-portal-research

Tooling and agent prompts for researching venue captive portals — cafes,
hotels, hostels, libraries, conference Wi-Fi — on your own Linux laptop,
with your own credentials, on networks you are authorized to use.

You capture your own login session as a HAR file with Playwright, an
[opencode](https://opencode.ai) agent session analyzes it and explains how
the portal works, then writes a machine-readable **venue profile** and an
auto-login you can hook into NetworkManager. Captures and profiles land in
gitignored folders — **your captured data never leaves your laptop and never
enters git**.

```
capture (playwright HAR)  ->  analyze (opencode)  ->  profile (JSON)  ->  automate (login.mjs)
       captures/*.har            what the portal does      profiles/*.json     dispatcher hook
                               (redacted explanations)                         (your credentials)
```

## Ethics (read first)

- Only networks you are **authorized** to use — venues you are a guest of.
- Your device, your credentials, your session. No collecting other guests'
  data, ever.
- Observe first: understand the flow (GETs, analysis) before you replay
  anything.
- No payment or entitlement bypass. Automating your own legitimate access is
  the goal — nothing else.
- Rate-limit your attempts (one per 30 s, stop after 3 failures).
- When in doubt, ask the venue. Most are happy to talk about their Wi-Fi.

## Quickstart (10 minutes, at the venue)

```sh
git clone <this repo> && cd captive-portal-research
npm init -y >/dev/null && npm i playwright-core
npx playwright install chromium        # one-time, ~150 MB

# in an `opencode` session in this directory:
#   1. paste prompts/00-setup.md      (toolchain check, ~1 min)
#   2. connect to the venue Wi-Fi — do NOT log in yet
#   3. paste prompts/10-capture.md    (capture; you complete the login)
#   4. paste prompts/20-analyze.md    (explains how the portal works)
#   5. paste prompts/30-profile.md    (writes profiles/<venue>.json)
#   6. home again? prompts/40-automate.md (auto-login + NM hook)
```

At the cafe today? Do 0→10→20→30 and stop: the profile is the deliverable.
Prompt 40 (automation) is better done somewhere patient.

## Layout

| Path | What |
|---|---|
| `prompts/00-setup.md` … `40-automate.md` | paste-ready opencode prompts, one per phase |
| `tools/record-har.mjs` | headed Chromium, records your login as a HAR |
| `tools/analyze-har.mjs` | offline HAR analysis (redacted output, zero network) |
| `tools/redact-har.mjs` | sanitized HAR copy for sharing |
| `tools/login.mjs` | replays a venue profile (own credentials, cookie jar) |
| `docs/lessons-learned.md` | how portals detect, redirect, authenticate, remember |
| `docs/prior-art.md` | RFCs, WISPr, travelmate, platform probe behavior |
| `captures/` | your HARs + analysis notes — **gitignored** |
| `profiles/` | venue profiles — **gitignored** |

HAR files contain your credentials. That is the entire reason `captures/`
and `profiles/` are gitignored: keep it that way.

## The venue profile

A minimal JSON description of one portal (see `prompts/30-profile.md` for
the schema): how to match the venue (SSID, portal host), the ordered HTTP
steps of the login with `{{user}}`/`{{pass}}` placeholders, and the success
condition. `tools/login.mjs` replays it; prompt 40 wires it into
NetworkManager so your laptop logs itself back in on that venue.

## License

MIT — see LICENSE.
