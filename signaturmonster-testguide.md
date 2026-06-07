# Signaturmonster — Lokaler Testguide

Dieser Guide führt dich durch den ersten lokalen Test des SMTP-Proxys **ohne Docker**, direkt mit Python und einem einfachen Mailclient-Test.

---

## Voraussetzungen

- Python 3.12+
- `pip` verfügbar
- Thunderbird oder ein anderer Mailclient
- Zugang zu deinem echten Mailprovider (IONOS, Strato, Mailcow — als Relay)

---

## Schritt 1 — Virtuelle Umgebung + Abhängigkeiten

```bash
cd signaturmonster/smtp-proxy

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install aiosmtpd aiohttp aiosmtplib beautifulsoup4 lxml python-dotenv
```

---

## Schritt 2 — Backend starten

In einem zweiten Terminal:

```bash
cd signaturmonster/backend

python -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn sqlalchemy aiosqlite pydantic httpx passlib bcrypt

mkdir -p /tmp/smdata
DATABASE_URL="sqlite+aiosqlite:////tmp/smdata/signaturmonster.db" \
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend läuft jetzt auf `http://localhost:8000`.  
Swagger-Doku erreichbar unter: `http://localhost:8000/docs`

---

## Schritt 3 — Erste Signatur anlegen (via API)

```bash
curl -X POST http://localhost:8000/api/signatures/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard Signatur",
    "html_content": "<p>--<br><strong>Max Mustermann</strong><br>Holdermann IT<br>Tel: +49 123 456789<br><a href=\"mailto:max@holdermann.de\">max@holdermann.de</a></p>",
    "text_content": "--\nMax Mustermann\nHoldermann IT\nTel: +49 123 456789\nmax@holdermann.de",
    "is_default": true
  }'
```

Antwort enthält eine `id` — z.B. `1`. Diese brauchst du im nächsten Schritt.

---

## Schritt 4 — Regel anlegen

Catch-all Regel: jede ausgehende Mail bekommt die Signatur.

```bash
curl -X POST http://localhost:8000/api/rules/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Catch-all Signatur",
    "match_sender": null,
    "match_domain": null,
    "apply_on_new": true,
    "apply_on_reply": false,
    "signature_id": 1,
    "priority": 100,
    "is_active": true
  }'
```

Oder eine Domain-spezifische Regel:

```bash
curl -X POST http://localhost:8000/api/rules/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Holdermann Domain",
    "match_domain": "holdermann.de",
    "apply_on_new": true,
    "apply_on_reply": false,
    "signature_id": 1,
    "priority": 50,
    "is_active": true
  }'
```

---

## Schritt 5 — SMTP-Proxy konfigurieren und starten

Umgebungsvariablen setzen (dein echter Mailprovider als Relay):

```bash
# IONOS / Strato Beispiel:
export BACKEND_URL=http://localhost:8000
export RELAY_HOST=smtp.ionos.de        # oder smtp.strato.de / mail.deinserver.de
export RELAY_PORT=587
export RELAY_USER=deine@mail.de
export RELAY_PASS=deinPasswort

# Mailcow Beispiel:
export RELAY_HOST=mail.deinedomain.de
export RELAY_PORT=587
export RELAY_USER=deine@mail.de
export RELAY_PASS=deinPasswort
```

Proxy starten (Port 587 braucht auf Linux ggf. `sudo` oder den Port auf 2587 ändern):

```bash
# Als normaler User auf Port 2587 testen:
SMTP_PORT=2587 python main.py
```

Ausgabe sollte sein:
```
2025-xx-xx [INFO] Signaturmonster SMTP Proxy running on port 2587
```

---

## Schritt 6 — Thunderbird konfigurieren

In Thunderbird ein bestehendes Konto anpassen:

1. **Konten-Einstellungen** öffnen
2. Konto auswählen → **Postausgangs-Server (SMTP)**
3. Neuen SMTP-Server anlegen:
   - Server: `localhost`
   - Port: `2587` (oder `587` falls als root gestartet)
   - Verbindungssicherheit: **Keine** (lokal, kein TLS nötig)
   - Authentifizierung: **Keine** (vorerst für den Test)
4. Diesem Konto den neuen SMTP-Server zuweisen

> **Wichtig:** Der Absender bleibt deine echte Adresse — Signaturmonster leitet die Mail nur weiter und fügt die Signatur ein. Thunderbird selbst muss keine Signatur mehr konfiguriert haben.

---

## Schritt 7 — Testmail senden

1. In Thunderbird eine neue Mail verfassen
2. An eine eigene Testadresse senden (z.B. Gmail zum Prüfen)
3. **Eigene Thunderbird-Signatur deaktivieren** (falls vorhanden), damit man den Unterschied sieht

Im Proxy-Terminal sollte erscheinen:
```
[INFO] Processing mail from: deine@mail.de
[INFO] Signature 'Standard Signatur' injected
[INFO] Relayed to smtp.ionos.de
```

---

## Schritt 8 — Regel-Matching testen (ohne Thunderbird)

Direkt gegen die API testen ob die Regel-Engine funktioniert:

```bash
# Neue Mail → sollte Signatur zurückgeben
curl -X POST http://localhost:8000/api/rules/match \
  -H "Content-Type: application/json" \
  -d '{"sender": "max@holdermann.de", "domain": "holdermann.de", "is_reply": false}'

# Antwort → je nach Regel-Konfiguration kein Match
curl -X POST http://localhost:8000/api/rules/match \
  -H "Content-Type: application/json" \
  -d '{"sender": "max@holdermann.de", "domain": "holdermann.de", "is_reply": true}'
```

---

## Lexware-Integration testen (optional)

Token setzen:

```bash
export LEXWARE_API_TOKEN=dein-lexware-token
```

Backend neu starten, dann:

```bash
curl -X POST http://localhost:8000/api/enrichment/lexware \
  -H "Content-Type: application/json" \
  -d '{"message_subject": "Angebot RE-2025-0042"}'
```

Bei Treffer kommt zurück:
```json
{
  "angebot_nummer": "RE-2025-0042",
  "kunde_name": "Musterfirma GmbH",
  "betrag_brutto": "2380.00",
  "waehrung": "EUR"
}
```

Eine Signatur mit Template-Variablen anlegen:

```bash
curl -X POST http://localhost:8000/api/signatures/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Angebot Signatur",
    "html_content": "<p>Anbei unser Angebot <strong>{{angebot_nummer}}</strong> für <strong>{{kunde_name}}</strong> über {{betrag_brutto}} {{waehrung}}.</p><p>--<br>Max Mustermann · Holdermann IT</p>",
    "text_content": "Anbei unser Angebot {{angebot_nummer}} für {{kunde_name}} über {{betrag_brutto}} {{waehrung}}.\n\n--\nMax Mustermann · Holdermann IT"
  }'
```

Dann eine Regel mit `enrichment_source: "lexware"` anlegen — Signaturmonster erkennt automatisch Lexware-Mails per Vorgangsnummer im Betreff und befüllt die Template-Variablen.

---

## JTL-Wawi Integration (geplant)

Für JTL-Wawi wird der gleiche Ansatz funktionieren — Angebote aus der Wawi-Datenbank per SQL abfragen und als Template-Variablen bereitstellen. Der Endpunkt dafür wird `POST /api/enrichment/jtl` sein.

Typische Abfrage (analog zu bisheriger JTL-Arbeit):

```sql
SELECT
  a.cBestellNr        AS angebot_nummer,
  k.cFirma            AS kunde_firma,
  k.cVorname + ' ' + k.cNachname AS kunde_name,
  a.fGesamtpreis      AS betrag_brutto
FROM tBestellung a
JOIN tKunde k ON k.kKunde = a.kKunde
WHERE a.cBestellNr = @nummer
```

Die `services/jtl.py` wird per pyodbc oder einem MSSQL-Adapter angebunden.

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| Port 587 belegt / Permission denied | `SMTP_PORT=2587 python main.py` |
| Backend nicht erreichbar | `curl http://localhost:8000/health` prüfen |
| Mail landet im Spam | Relay-Credentials prüfen, RELAY_HOST korrekt? |
| Signatur wird nicht eingefügt | `curl .../api/rules/match` testen — Regel aktiv? |
| HTML-Signatur defekt | BeautifulSoup-Parsing — HTML in Signatur auf Gültigkeit prüfen |
| Thunderbird TLS-Fehler | Verbindungssicherheit auf "Keine" setzen (nur lokal!) |

---

## Nächste Schritte nach erfolgreichem Test

1. **Frontend-Dashboard** bauen: Signaturen und Regeln per UI verwalten
2. **JTL-Wawi Service** implementieren (`services/jtl.py`)
3. **Docker Compose** aufsetzen für Produktivbetrieb
4. **WYSIWYG-Editor** für HTML-Signaturen integrieren (z.B. TipTap oder Quill)
5. **Install-Script** analog zu Datenmonster (`install.sh` / `install.ps1`)
