# Reddit Post (English) — r/selfhosted / r/sysadmin / r/homelab

**Title:** I built a self-hosted SMTP proxy that injects email signatures company-wide — no client config needed

---

I've been working in IT for years and constantly deal with products built around Microsoft and Google platforms. Outside of those two, options get thin fast. Signaturmonster is my attempt to give people running their own infrastructure a bit of comfort when it comes to signature management — centrally controlled, on your own servers, whether that's a small Raspberry Pi or an LXC container under Proxmox. I run it myself on Proxmox behind a DynDNS address and it works without issues.

The idea is simple: a small SMTP proxy sits between your mail client and your actual mail server. Every outgoing mail passes through it, gets the correct signature injected, and is forwarded on. Users don't touch their mail client — they just point their SMTP at the proxy instead of the real server. One change, done for everyone.

**What it does:**

- **Signature designer** — drag-and-drop block editor: text, images, social icons, buttons, disclaimers, 2-column layouts, tables. Builds HTML + plain text versions automatically.
- **Rule engine** — different signatures per sender, domain, time window, or day of week. Priority-ordered with a built-in test simulator.
- **Sender profiles** — per-address variables (`{{firstname}}`, `{{company}}`, `{{phone}}` …) resolved at send time. No placeholder shows up literally even if a profile is missing.
- **CI wrapper** — wrap outgoing mail in a branded HTML template (logo, header, footer, custom colors). Outlook-safe table layout.
- **Banner campaigns** — time-gated image banners with weighted rotation (higher weight = shown more often), impression + click tracking, UTM parameters.
- **CSS inliner** — `<style>` blocks get converted to inline styles before delivery. Better rendering in Outlook, Apple Mail, and webmail clients.
- **Mail queue with retry** — exponential backoff (1 min → 5 min → 30 min → 2 h); manual retry from the dashboard; bounce notifications.
- **Audit log** — every processed email logged with sender, rule matched, relay status, duration, message size. CSV export, configurable retention.
- **Thunderbird addon** — live signature preview while composing, without touching the mail client's own signature settings.
- **Self-update** — built-in updater checks GitHub releases, pulls new images, restarts containers. nginx stays up during the update.

**Stack:** FastAPI + aiosmtpd + React + SQLite, all in Docker Compose. No cloud dependency, no telemetry, runs on a small VPS or an LXC container.

**GitHub:** https://github.com/choldermann/signaturmonster

You'll need access to your mail provider's infrastructure — SMTP host, username and password. Happy to answer questions, especially on the SMTP proxy side — there's more going on there than it looks. I'm also looking for testers — if you want to give it a try, just reach out.

---

*Suggested subreddits: r/selfhosted, r/sysadmin, r/homelab*
