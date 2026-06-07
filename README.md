# Signaturmonster

Self-hosted SMTP Signatur-Proxy mit Lexware Office Integration.

## Quick Start

```bash
cp .env.example .env
# .env anpassen (RELAY_HOST, RELAY_USER, RELAY_PASS, LEXWARE_API_TOKEN)
docker compose up -d
```

## Thunderbird konfigurieren

SMTP-Server: `localhost` (oder IP des Docker-Hosts)  
Port: `587`  
Authentifizierung: STARTTLS  
Benutzername/Passwort: wie im Dashboard angelegt

## Architektur

```
[Thunderbird] → SMTP :587 → [Signaturmonster Proxy]
                                    ↓ Regel-Engine
                                    ↓ Signatur einfügen
                                    ↓ Optional: Lexware-Daten
                             → [Kunden-Mailserver] → [Empfänger]
```

## Services

| Service   | Port | Beschreibung              |
|-----------|------|---------------------------|
| smtp-proxy | 587  | SMTP Eingang              |
| backend    | 8000 | FastAPI REST API          |
| frontend   | 3000 | React Web Dashboard       |

## Lexware Integration

1. API Token in `.env` eintragen: `LEXWARE_API_TOKEN=...`
2. Regel anlegen mit `enrichment_source: lexware`
3. Signatur-Template mit Variablen:  
   `{{angebot_nummer}}`, `{{kunde_name}}`, `{{betrag_brutto}}` etc.

Signaturmonster erkennt automatisch Lexware-Mails anhand der Vorgangsnummer im Betreff.
