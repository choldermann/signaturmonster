# Signaturmonster Native (Proof of Concept)

Signaturmonster ohne Docker: pro Betriebssystem zwei Dateien.

| Datei | Aufgabe |
|---|---|
| `signaturmonster-service` | Systemdienst: SMTP-Proxy + REST-API + eingebettete Web-UI, eine Binary, ein Thread |
| `signaturmonster-viewer` | Desktop-App (Tauri): Fenster mit der Web-UI + Tray-Icon mit Dienststatus |

Der Service ersetzt die Container `sm-smtp`, `sm-backend` und `sm-nginx`. Das React-Frontend
aus `../frontend/dist` wird beim Build in die Binary eingebettet. Er nutzt dasselbe
Datenbankschema wie das Python-Backend: eine bestehende `signaturmonster.db`, die
`.jwt_secret` und das Verzeichnis `tls/` können direkt übernommen werden.

## Stand des PoC

**Portiert:**
- SMTP-Server: STARTTLS, AUTH PLAIN/LOGIN gegen `smtp_users` (bcrypt), Größenlimit, Rate-Limit pro IP, Schutz gegen Pipelining nach STARTTLS
- Regel-Engine (Absender/Domain, Empfänger, intern/extern, Wochentage, Uhrzeit, Zeitzone)
- Signatur-Injektion in HTML und Text, Platzhalter aus dem Absender-Profil, Disclaimer, CSS-Inlining, „powered by"
- Kryptografisch signierte Mails (S/MIME, PGP) werden byte-genau durchgeleitet
- Relay: Konto aus der Regel → Domain/Default-Konto → Konfiguration; STARTTLS / implizites TLS (465) / opportunistisch (25, localhost); Weiterleitungskopien (`forward_to`)
- Mail-Log (`mail_logs`), optional mit Archiv
- API: `/api/auth/login`, `/api/auth/me`, `/api/signatures`, `/api/version`, `/api/proxy/status`, `/health`
- Installation als Dienst unter systemd, launchd und Windows SCM

**Noch nicht portiert:** alle übrigen API-Router (antworten mit 501), Mail-Queue/Retry,
CI-Beautifier, Kampagnen/Banner (inkl. GIF-Generator), `#sm:`-Befehle, Addon-Marker,
Lexware-Angebote, Lizenzprüfung, Updater.

## Bauen

```bash
# Frontend muss gebaut sein (wird eingebettet)
(cd ../frontend && npm run build)

cargo build --release -p signaturmonster-service
# → target/release/signaturmonster-service
```

`.cargo/config.toml` beschränkt den Build auf einen Compile-Job und einen Linker-Thread.
Auf einem stabilen Rechner geht es mit `cargo build -j 8` deutlich schneller.

**Viewer** (eigenes Cargo-Workspace, braucht unter Linux WebKitGTK):

```bash
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
cd viewer && cargo build --release
```

## Betrieb

```bash
# Entwicklung: im Vordergrund, eigenes Datenverzeichnis, unprivilegierter Port
SM_DATA_DIR=./dev-data SM_SMTP_PORT=2525 ./signaturmonster-service run

# Produktion: als Systemdienst (root / Administrator)
sudo ./signaturmonster-service install     # installiert + startet
sudo ./signaturmonster-service uninstall
```

Erster Login: `monster` / `monster` (wie beim Docker-Backend).

| Variable | Standard | |
|---|---|---|
| `SM_DATA_DIR` | `/var/lib/signaturmonster`, `/Library/Application Support/Signaturmonster`, `%ProgramData%\Signaturmonster` | DB, TLS, Secret |
| `SM_BIND` | `0.0.0.0` | |
| `SM_HTTP_PORT` | `8080` | Web-UI + API |
| `SM_SMTP_PORT` | `587` | |
| `SM_SMTP_REQUIRE_TLS` | `true` | AUTH nur nach STARTTLS |
| `SM_HOSTNAME` | `signaturmonster.local` | EHLO-Name, Zertifikat |
| `SM_RELAY_HOST/PORT/USER/PASS` | – | Fallback, wenn kein SMTP-Konto in der DB |
| `SM_LOG` | `info` | z.B. `debug` |

Alle Variablen können auch als `KEY=VALUE` in `<SM_DATA_DIR>/signaturmonster.conf` stehen.
Der Dienst-Installer übernimmt nur `SM_DATA_DIR`, alles andere gehört in diese Datei.

## Offene Punkte für ein Produkt

- **Code-Signing:** Windows (Authenticode, z.B. Azure Trusted Signing) und macOS (Developer ID + Notarisierung)
- **Installer:** Tauri bündelt den Viewer als `.msi`, `.dmg`, `.deb`/AppImage; der Service sollte als Sidecar mitgeliefert werden
- **CI:** GitHub-Actions-Matrix (windows-latest, macos-latest, ubuntu-latest) statt Docker-Images
- **Port 587** ist unter Linux/macOS privilegiert → als root-Dienst, oder mit `CAP_NET_BIND_SERVICE` in der systemd-Unit
