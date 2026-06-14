# Monstersuite-Anbindung: Übergabeprotokoll

Stand: 2026-06-14  
Ziel: Signaturmonster-Feature-Gating aktivieren durch Live-Anbindung an monstersuite.de

---

## 1. Produkt in Monstersuite-DB anlegen

Produkt-Slug (fix, hartcodiert in Signaturmonster): **`signaturmonster`**  
Version (aktuell): `0.6.0`

### Pläne

| Plan-Slug | Anzeigename     | Enthaltene Features                                                                 |
|-----------|-----------------|--------------------------------------------------------------------------------------|
| `free`    | Kostenlos       | *(keine — Free-Features sind clientseitig immer aktiv)*                             |
| `starter` | Starter         | `senders`, `disclaimer`                                                             |
| `pro`     | Pro             | `smtp_multi`, `ci_branding`, `senders`, `disclaimer`, `banners`, `templates`       |
| `business`| Business        | alle Pro-Features + `user_mgmt`                                                     |

### Feature-IDs (Paid-Features, die Monstersuite im Response zurückgeben muss)

| Feature-ID    | Beschreibung                                      |
|---------------|---------------------------------------------------|
| `smtp_multi`  | Mehrere SMTP-Konten mit Domain-Matching           |
| `ci_branding` | CI-Profile & Mail-Beautifier                      |
| `senders`     | Personalisierte Absenderprofile mit Variablen     |
| `disclaimer`  | Zentral verwaltete Rechtstexte                    |
| `banners`     | Banner-Bibliothek für Kampagnen                   |
| `templates`   | HTML-Vorlagen (Lexware / JTL-Wawi)                |
| `user_mgmt`   | Mehrere Administratoren                           |

> Free-Features (`smtp_basic`, `signatures`, `rules`) müssen **nicht** im Response stehen —
> Signaturmonster fügt sie clientseitig immer hinzu.

---

## 2. API-Endpoints auf monstersuite.de

Signaturmonster spricht zwei Endpoints an:

### POST `/api/v1/licenses/activate`

Wird aufgerufen beim ersten Eingeben eines Lizenzschlüssels im UI.

**Request-Body (JSON, von Signaturmonster gesendet):**
```json
{
  "license_key": "SM-XXXX-XXXX-XXXX",
  "email":       "kunde@beispiel.de",
  "machine_id":  "a3f9c1d2e4b5...",
  "hostname":    "signaturmonster-backend",
  "product":     "signaturmonster",
  "version":     "0.6.0"
}
```

**Response bei Erfolg:**
```json
{
  "valid":         true,
  "plan":          "Pro",
  "email":         "kunde@beispiel.de",
  "valid_until":   "2027-06-14T00:00:00",
  "features":      ["smtp_multi", "ci_branding", "senders", "disclaimer", "banners", "templates"],
  "activation_id": "uuid-oder-interne-id"
}
```

**Response bei Fehler:**
```json
{
  "valid":   false,
  "error":   "invalid_key",
  "message": "Dieser Lizenzschlüssel ist ungültig."
}
```

Mögliche `error`-Werte: `invalid_key` | `expired` | `max_activations` | `suspended`

**Server-seitige Aufgaben bei Aktivierung:**
- Lizenzschlüssel in DB prüfen (Produkt = `signaturmonster`)
- `machine_id` + `hostname` zur Aktivierung speichern
- Aktivierungszähler hochzählen (für Max-Activations-Limit)
- `activation_id` zurückgeben

---

### POST `/api/v1/licenses/validate`

Wird alle 24h automatisch von Signaturmonster aufgerufen (Cache-Refresh).  
Selbes Request-Format wie `/activate`.

**Response bei Erfolg:** identisch mit `/activate`-Response  
**Response bei Fehler:** identisch mit `/activate`-Response

**Unterschied zu `/activate`:** Kein neuer Aktivierungseintrag — nur prüfen ob bestehende Aktivierung für diese `machine_id` noch gültig ist.

---

## 3. Signaturmonster: Umgebungsvariable setzen

In `/home/holdi/Nextcloud/Documents/signaturmonster/.env`:

```env
LICENSE_SERVER_URL=https://monstersuite.de
```

Nach dem Setzen: `docker compose up -d backend` (oder Update-Trigger auf dem Produktionsserver).

Optional für Dev/Demo-Keys ohne Server:
```env
LICENSE_SECRET=<beliebiges-geheimnis>
```

---

## 4. Testplan nach Deployment

1. **Kein Key gesetzt** → `GET /api/license/` gibt `status: free` zurück ✓  
2. **Ungültiger Key aktivieren** → Response: `{ ok: false, error: "invalid_key" }` ✓  
3. **Gültigen Key aktivieren** → Response: `{ ok: true, plan: "Pro", features: [...] }` ✓  
4. **Feature-Gate testen** → `GET /api/templates/` ohne Lizenz → HTTP 402 ✓  
5. **Feature-Gate testen** → `GET /api/templates/` mit Pro-Lizenz → HTTP 200 ✓  
6. **Validate-Cycle** → `POST /api/license/refresh` → Server wird angefragt, Cache erneuert ✓  
7. **Grace Period** → `LICENSE_SERVER_URL` auf toten Host zeigen, warten — nach 14 Tagen Fallback auf Free ✓

---

## 5. Curl-Schnelltest (nach Deployment)

```bash
# Aktivierung testen
curl -X POST https://monstersuite.de/api/v1/licenses/activate \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "SM-TEST-KEY",
    "email": "test@test.de",
    "machine_id": "testmachine123",
    "hostname": "testhost",
    "product": "signaturmonster",
    "version": "0.6.0"
  }'
```
