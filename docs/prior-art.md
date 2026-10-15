# Prior art

Public, vendor-neutral work that informed this toolkit. Borrow concepts, not
code, and verify anything you depend on against the current source.

## Standards

- **RFC 7710 — Captive-Portal Identification in DHCP/RADIUS** (2016).
  DHCP option 114 advertises the portal URI. First standardized way for a
  network to say "here is my portal" before any redirect happens.
- **RFC 8908 — Captive Portal API** (2020). A JSON API the client polls for
  portal state (`locked`/`unlocked`, session info, logout URL). The clean
  future of captive portals; implement a client for it when you meet one.
- **RFC 8910 — Captive-Portal URI DHCP option** (2020). Updates 7710.
  Concept to borrow: state should be queryable, not guessed from redirects.

## Wi-Fi Alliance

- **WISPr (Wireless Internet Service Provider roaming)** — the XML
  credential-submission dialect (`WISPAccessGatewayParam`,
  `AuthenticationReply`, `LoginResult`/`ResponseCode`) that hospitality
  portals still speak. Knowing the shape lets you recognize it in a HAR and
  replay it directly. The spec itself dates from the 2000s; canonical copies
  float around — search "WISPr 1.0 specification" / "WISPr 2.0".

## Open source projects

- **OpenWrt travelmate** — the reference auto-login daemon in the embedded
  world: detects a captive state, runs per-venue login scripts, retries with
  backoff, rotates MAC if configured. Architecture to copy for any
  "automate my venue" tool: detect → match profile → act → verify → report.
- **NetworkManager dispatcher scripts** — the standard laptop-side hook
  point for "something changed on this interface"; countless captive-portal
  auto-login snippets have been written for it. Ours (prompt 40) is one of
  them.
- **systemd-networkd + networkd-dispatcher** — the equivalent hook surface
  when you are not on NetworkManager.
- **playwright's `recordHar`** — the capture primitive this toolkit is built
  on: a real Chromium session, full bodies, httpOnly cookies included.
- **mitmproxy** — interactive HTTP(S) observation; heavier than a HAR but
  unbeatable when a portal's app does non-HTTP things (raw sockets,
  certificate pinning failures).
- **curl + cookie jar** (`curl -c jar -b jar`) — the minimal replay tool;
  our `tools/login.mjs` is a structured version of exactly this pattern.

## Platform behavior references

- Apple's *Captive Network Assistant* behavior (probe: `captive.apple.com`,
  `Captive-Portal: true` header on the mini-browser) — documented across
  Apple support notes and Wi-Fi Alliance material.
- Android's connectivity checks (`connectivitycheck.gstatic.com`,
  `clients3.google.com/generate_204`) — documented in AOSP's
  NetworkMonitor sources.
- Windows NCSI (`msftconnecttest.com`) — Microsoft's networking docs
  describe the probe pair (`redirect` + `connecttest.txt`).

## Research writing worth reading

- Studies of captive-portal security in the wild (several peer-reviewed
  measurements from 2014–2019 surveyed portals on DHCP-injected portals,
  TLS usage, and session handling; search "captive portal measurement
  study"). Consistent findings: portals overwhelmingly do their logic in
  plain HTTP except the credential POST, sessions ride on MACs and cookies,
  and logout endpoints are frequently unauthenticated — all things your
  own capture will confirm or refute for your venue.

## What is deliberately absent

No payment-bypass, credential-harvesting, rogue-AP, deauth, or cracking
content. This toolkit automates your own legitimate access to networks you
are authorized to use — nothing else.
