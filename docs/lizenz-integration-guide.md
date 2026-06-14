# Monstersuite Lizenz-Integration — Entwicklerhandbuch

Dieses Dokument beschreibt die vollständige Lizenzarchitektur wie sie in Signaturmonster
implementiert ist. Als Vorlage für alle zukünftigen Monstersuite-Produkte.

---

## Architekturübersicht

```
[Browser/UI]
     │ POST /api/license/activate
     │ GET  /api/license/
     │ POST /api/license/refresh
     ▼
[Produkt-Backend]
     │ POST https://monstersuite.de/api/v1/licenses/activate
     │ POST https://monstersuite.de/api/v1/licenses/validate
     ▼
[Monstersuite License-Server]
```

Der Produkt-Backend ist der einzige Kommunikationspartner mit Monstersuite.
Der Browser spricht nie direkt mit dem License-Server.

---

## Umgebungsvariablen

| Variable             | Pflicht | Standard                    | Beschreibung                                      |
|----------------------|---------|-----------------------------|---------------------------------------------------|
| `LICENSE_SERVER_URL` | Nein    | `https://monstersuite.de`   | URL des License-Servers                           |
| `LICENSE_SECRET`     | Nein    | *(leer)*                    | HMAC-Secret für Offline-/Demo-Keys                |
| `LICENSE_GRACE_DAYS` | Nein    | `14`                        | Tage bis Free-Fallback wenn Server unerreichbar   |

In `docker-compose.yml` immer als `${LICENSE_SERVER_URL:-https://monstersuite.de}` eintragen,
damit die Variable aus der `.env`-Datei gelesen wird.

---

## Wichtig: Stabiler Hostname im Container

**Problem:** Docker vergibt bei jedem Container-Neustart eine neue ID als Hostname.
Die `machine_id` wird aus Hostname + MAC-Adresse berechnet → sie ändert sich bei jedem Neustart.
Monstersuite speichert die `machine_id` bei Aktivierung und prüft sie bei Validate → `not_activated`.

**Lösung:** Fixen Hostnamen in `docker-compose.yml` setzen:

```yaml
services:
  backend:
    hostname: meinprodukt-backend   # ← IMMER setzen, nie weglassen
```

Wenn der Hostname fehlt und der Container neu gestartet wird:
1. Neue machine_id → Validate schlägt mit `not_activated` fehl
2. Lizenz muss erneut aktiviert werden
3. Alte Aktivierung in Monstersuite bleibt als Leiche stehen

---

## API-Vertrag mit Monstersuite

### Request (beide Endpoints identisch)

```json
{
  "license_key": "XX-0000-0000-0000-0000",
  "email":       "kunde@beispiel.de",
  "machine_id":  "32-stelliger SHA256-Hash",
  "hostname":    "meinprodukt-backend",
  "product":     "produkt-slug",
  "version":     "1.0.0"
}
```

**`machine_id`** wird clientseitig berechnet:
```python
raw = f"{socket.gethostname()}-{uuid.getnode()}-{PRODUCT_SLUG}"
machine_id = hashlib.sha256(raw.encode()).hexdigest()[:32]
```

### Response bei Erfolg

```json
{
  "valid":         true,
  "plan":          "pro",
  "email":         "kunde@beispiel.de",
  "valid_until":   "2027-06-14T00:00:00",
  "features":      ["feature_a", "feature_b"],
  "activation_id": "act_1"
}
```

`valid_until: null` bedeutet unbegrenzte Lizenz — wird korrekt behandelt (kein Ablauf).

### Response bei Fehler

```json
{
  "valid":   false,
  "error":   "invalid_key",
  "message": "Menschenlesbarer Fehlertext"
}
```

| `error`-Wert      | Bedeutung                              |
|-------------------|----------------------------------------|
| `invalid_key`     | Key nicht gefunden                     |
| `expired`         | Lizenz abgelaufen                      |
| `max_activations` | Maximale Aktivierungen erreicht        |
| `suspended`       | Lizenz gesperrt                        |
| `not_activated`   | machine_id nicht in Aktivierungen      |

### Unterschied activate vs. validate

| Endpoint    | Wann              | Seiteneffekt in Monstersuite                  |
|-------------|-------------------|-----------------------------------------------|
| `/activate` | Erster Key-Eingabe | Neue Aktivierung anlegen, machine_id speichern |
| `/validate` | Alle 24h          | Nur prüfen, keine neue Aktivierung             |

---

## Lizenz-Lifecycle im Produkt

### 1. Kein Key gesetzt
→ `status: free`, nur Free-Features aktiv, kein Server-Kontakt

### 2. Aktivierung (User gibt Key ein)
1. POST `/activate` an Monstersuite
2. Bei Erfolg: Key + Email + Response in DB cachen
3. `active_features` = Free-Features ∪ Features aus Response

### 3. Tägliche Validierung (automatisch)
- Cache-Alter wird geprüft (`license_cache_at` in DB)
- Älter als 24h → POST `/validate` an Monstersuite
- Bei Erfolg: Cache erneuern
- Bei Fehler (Server nicht erreichbar): Grace Period starten

### 4. Grace Period (Server nicht erreichbar)
- Letzter gültiger Cache wird weiter verwendet
- Standard: 14 Tage (`LICENSE_GRACE_DAYS`)
- Nach Ablauf: automatischer Fallback auf Free-Plan

### 5. Offline-Keys (Dev/Demo)
- Wenn `LICENSE_SECRET` gesetzt: HMAC-signierte Keys ohne Server-Kontakt
- Format: `base64url(payload).hmac_sha256`
- Nur für Entwicklung/Demos — nie in Produktion

---

## Feature-Definitionen

Im Produkt-Backend werden Features als Liste definiert:

```python
ALL_FEATURES = [
    {"id": "feature_free",  "name": "...", "description": "...", "category": "...", "free": True},
    {"id": "feature_paid",  "name": "...", "description": "...", "category": "...", "free": False},
]
FREE_FEATURES = {f["id"] for f in ALL_FEATURES if f["free"]}
```

**Wichtig:** Free-Features müssen NICHT von Monstersuite zurückgegeben werden —
das Produkt fügt sie immer selbst hinzu. Monstersuite kennt und verwaltet nur die Paid-Features.

### Feature-Gate im Backend (FastAPI)

```python
# Dependency-Factory
def require_feature(feature_id: str):
    async def _check(db: AsyncSession = Depends(get_db)):
        lic = await _resolve_license(db)
        if feature_id not in (lic.get("active_features") or []):
            raise HTTPException(402, f"Feature '{feature_id}' nicht lizenziert")
    return _check

# Anwendung auf Router-Ebene (alle Endpoints des Routers)
app.include_router(router, prefix="/api/templates", dependencies=[Depends(require_feature("templates"))])

# Anwendung auf Endpoint-Ebene (einzelne Endpoints)
@router.get("/", dependencies=[Depends(require_feature("feature_id"))])
async def list_items(): ...
```

**Niemals** auf public Endpoints anwenden (Tracking, Serve, Thumbnails).

### Feature-Gate im Frontend (React)

```javascript
// Mapping: Seiten-ID → Feature-ID
const PAGE_FEATURE = {
  "meine-seite": "feature_paid",
};

// Menü: gesperrte Seiten ausgegraut
const locked = requiredFeature && !activeFeatures.has(requiredFeature);

// Seiteninhalt: gesperrte Seiten zeigen Lock-Screen
if (requiredFeature && !activeFeatures.has(requiredFeature)) {
  return <LockedFeaturePage />;
}
```

`activeFeatures` wird beim App-Start von `GET /api/license/` geladen.
Der Auth-Token muss im Request-Header mitgeschickt werden — globaler fetch-Interceptor
in `main.jsx` erledigt das automatisch für alle `/api/`-Calls.

---

## Checkliste: Neues Produkt anbinden

### Im Produkt

- [ ] `PRODUCT_SLUG` setzen (eindeutig, kebab-case, z.B. `"meinprodukt"`)
- [ ] `VERSION` aktuell halten
- [ ] `ALL_FEATURES` definieren (free + paid)
- [ ] `require_feature()` auf alle Paid-Endpoints anwenden
- [ ] Frontend `PAGE_FEATURE`-Map befüllen
- [ ] `hostname: meinprodukt-backend` in `docker-compose.yml` setzen
- [ ] `LICENSE_SERVER_URL: "${LICENSE_SERVER_URL:-https://monstersuite.de}"` in `docker-compose.yml`

### In Monstersuite

- [ ] Produkt anlegen mit Slug (muss `PRODUCT_SLUG` exakt matchen)
- [ ] Pläne anlegen (free/starter/pro/business o.ä.)
- [ ] Paid-Feature-IDs den Plänen zuordnen
- [ ] `/api/v1/licenses/activate` unterstützt neues Produkt
- [ ] `/api/v1/licenses/validate` unterstützt neues Produkt

### Nach Deployment

- [ ] `GET /api/license/` gibt `status: free` zurück (kein Key)
- [ ] Aktivierung mit gültigem Key gibt `status: active` zurück
- [ ] `POST /api/license/refresh` gibt `ok: true` zurück
- [ ] Paid-Endpoint ohne Lizenz gibt HTTP 402 zurück
- [ ] Paid-Endpoint mit Lizenz gibt HTTP 200 zurück

---

## Bekannte Fallstricke

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Validate schlägt mit `not_activated` fehl | Hostname fehlt in docker-compose → machine_id wechselt | `hostname:` setzen, Lizenz neu aktivieren |
| `status: free` obwohl Key gesetzt | Auth-Token fehlt beim `GET /api/license/` Request | fetch-Interceptor in main.jsx prüfen |
| Refresh zeigt Fehler-Toast | Validate-Endpoint auf Monstersuite fehlt oder gibt `valid: false` | Direkt gegen Monstersuite testen: `curl -X POST .../validate` |
| Feature gesperrt obwohl lizenziert | Feature-ID in Monstersuite-Plan fehlt | Feature-ID zum Plan in Monstersuite hinzufügen |
| Grace Period läuft ab | Server 14 Tage nicht erreichbar | Monstersuite-Deployment prüfen |
