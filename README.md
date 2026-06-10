# Signaturmonster

**Self-hosted SMTP signature proxy with a full-featured web dashboard.**

Signaturmonster sits between your mail client and your outgoing mail server. Every email passing through is automatically stamped with the right signature — based on sender, recipient, time-of-day, or day-of-week rules. No plugins, no mail client changes, no cloud dependency.

---

## Features

### Core
- **SMTP proxy** — intercepts outgoing mail on port 587, injects signatures, forwards to any relay
- **Drag & drop signature designer** — build HTML signatures with blocks: text, image, banner, link/button, social media icons, disclaimers, dividers, spacers, 2-column layouts, tables
- **Rule engine** — match by sender, sender domain, recipient, recipient domain, time window, weekdays; priority-ordered rules; test simulator built in
- **Sender profiles** — per-email-address variables (`{{vorname}}`, `{{firma}}`, `{{telefon}}`, …) filled at send time
- **Multi-relay support** — configure multiple SMTP accounts; automatic domain-based relay selection with manual override per rule

### Design & Branding
- **CI profiles** — wrap outgoing mail in a custom HTML template (logo, header, footer, colors, font); Outlook-safe table layout
- **Banner library** — create reusable campaign banners with solid colors or CSS gradients, Outlook fallback colors, UTM tracking links
- **Image database** — upload JPEG/PNG/GIF/WebP; auto-thumbnails; CID embed for Outlook; animated GIF support with static PNG fallback for Outlook
- **UTM tracking** — attach UTM parameters to links, buttons, and banners; preview the final URL inline

### Compliance & Monitoring
- **Disclaimer management** — maintain legal texts separately; assign per rule; appears in the signature's placeholder block
- **Mail audit log** — every processed email is logged (sender, recipients, subject, matched rule, action, relay status, duration, size); CSV export; configurable 90-day retention
- **Mail queue with retry** — exponential backoff (1 min → 5 min → 30 min → 2 h → failed); manual retry; status dashboard
- **System log** — live event stream from backend and proxy; filterable by level and service
- **Resource monitoring** — CPU, RAM, disk sparkline charts (4-second polling)

### Enterprise
- **Campaign system** — time-gated image campaigns with impression and click tracking
- **Offer templates** — replace mail body with a branded HTML proposal (Lexware Office data enrichment: offer number, customer, line items, totals)
- **License system** — online validation against monstersuite.de; Free and Pro plans; 14-day grace period on server outage
- **Self-update** — built-in updater container checks GitHub releases, pulls new images, restarts services; nginx stays up during updates
- **User management** — JWT-secured admin panel; bcrypt passwords; SMTP proxy users managed separately

---

## Requirements

- Docker 20.10+ with the Compose plugin (or Docker Desktop)
- A working outgoing mail server (SMTP relay) — Gmail, IONOS, Strato, Mailcow, or any SMTP service

---

## Installation

### One-liner (Linux / macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/choldermann/signaturmonster/main/install.sh | bash
```

The installer checks for Docker, asks for an install directory and ports, downloads `docker-compose.yml`, generates a `.env` with a random secret key, and starts all containers.

### Manual installation

```bash
# 1. Download config files
mkdir -p ~/signaturmonster/data ~/signaturmonster/nginx
cd ~/signaturmonster
curl -fsSL https://raw.githubusercontent.com/choldermann/signaturmonster/main/docker-compose.yml -o docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/choldermann/signaturmonster/main/nginx/nginx.conf -o nginx/nginx.conf

# 2. Create and edit .env
cp .env.example .env
$EDITOR .env   # fill in at minimum: RELAY_HOST, RELAY_USER, RELAY_PASS

# 3. Start
docker compose up -d
```

Open the dashboard at **http://localhost:8080** and log in with `monster / monster` (change immediately under *Settings → Users*).

### Windows

```powershell
irm https://raw.githubusercontent.com/choldermann/signaturmonster/main/install.ps1 | iex
```

---

## Configuration

All settings live in `.env` in the install directory.

| Variable | Default | Description |
|---|---|---|
| `RELAY_HOST` | _(required)_ | Outgoing mail server hostname |
| `RELAY_PORT` | `587` | Outgoing mail server port |
| `RELAY_USER` | _(required)_ | SMTP username |
| `RELAY_PASS` | _(required)_ | SMTP password |
| `SMTP_PORT` | `587` | Port your mail client connects to |
| `HTTP_PORT` | `8080` | Web dashboard port |
| `SECRET_KEY` | `changeme` | JWT signing key — **change this** |
| `PROXY_SECRET` | `changeme` | Internal proxy→backend token — **change this** |
| `LEXWARE_API_TOKEN` | _(optional)_ | Lexware Office API token for offer templates |
| `GITHUB_TOKEN` | _(optional)_ | Speeds up GitHub release checks in the updater |
| `LICENSE_SERVER_URL` | `https://monstersuite.de` | License validation server |
| `LICENSE_GRACE_DAYS` | `14` | Days to keep license valid when server is unreachable |

---

## Mail client setup

Configure your mail client (Thunderbird, Outlook, Apple Mail, …) to use Signaturmonster as its outgoing server:

| Setting | Value |
|---|---|
| SMTP server | IP address of the Docker host |
| Port | `587` (or your `SMTP_PORT`) |
| Security | STARTTLS |
| Username / Password | as created in the dashboard under *Settings → SMTP Users* |

The proxy auto-generates a self-signed TLS certificate on first start. To use your own certificate, set `TLS_CERT_FILE` and `TLS_KEY_FILE` in `.env`.

---

## Architecture

```
[Mail client]
     │ SMTP :587
     ▼
[Signaturmonster SMTP Proxy]
     │
     ├─ Rule engine → matches sender / recipient / time
     ├─ Sender profile → fills {{variables}}
     ├─ Signature injector → appends HTML signature
     ├─ CI beautifier → wraps body in brand template (optional)
     ├─ Offer template → replaces body with HTML proposal (optional)
     └─ Mail queue → sends via matching SMTP relay
                              │
                              ▼
                    [Your mail server]  →  [Recipient]
```

| Container | Image | Role |
|---|---|---|
| `sm-nginx` | `nginx:alpine` | Reverse proxy / entrypoint |
| `sm-frontend` | `ghcr.io/choldermann/signaturmonster-frontend` | React dashboard (Vite + nginx) |
| `sm-backend` | `ghcr.io/choldermann/signaturmonster-backend` | FastAPI REST API + SQLite |
| `sm-smtp` | `ghcr.io/choldermann/signaturmonster-smtp-proxy` | aiosmtpd-based SMTP proxy |
| `sm-updater` | `ghcr.io/choldermann/signaturmonster-updater` | Self-update service |

Data is persisted in `./data/signaturmonster.db` (SQLite, volume-mounted).

---

## Updating

The dashboard shows available updates under *System → Update*. Click **Update** to pull new images and restart.

Or from the command line:

```bash
docker compose pull && docker compose up -d
```

---

## Useful commands

```bash
make logs          # follow all container logs
make smtp-logs     # follow smtp-proxy logs only
make backend-logs  # follow backend logs only
make status        # show container status
make restart       # restart all containers
make down          # stop all containers
make clean         # stop and delete database (irreversible)
```

---

## License

Signaturmonster is licensed under the **MIT License** for self-hosted use.  
Pro and Enterprise plans are available at [monstersuite.de](https://monstersuite.de).

| Plan | Signatures | Rules | CI Branding | Campaigns | Multi-relay | Offer Templates |
|---|---|---|---|---|---|---|
| Free | ✓ | ✓ | — | — | — | — |
| Pro | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Activate a license key in the dashboard under *Settings → License*.
