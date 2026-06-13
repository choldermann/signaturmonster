"""
Signaturmonster — Lizenz-Client

Ablauf:
  1. Aktivierung → POST monstersuite.de/api/v1/licenses/activate
  2. Antwort wird lokal gecacht (Settings-Tabelle)
  3. Alle 24h: Neuvalidierung gegen Server
  4. Server nicht erreichbar → Grace Period (Standard: 14 Tage)
  5. Grace Period abgelaufen → Kostenlos-Plan

Offline-Fallback (nur wenn LICENSE_SECRET gesetzt):
  Signierte HMAC-Keys funktionieren auch ohne Server (Entwicklung / Demo).

monstersuite.de API-Vertrag (POST /api/v1/licenses/activate + /validate):
  Request:
    { license_key, email, machine_id, hostname, product, version }
  Response (Erfolg):
    { valid: true, plan, email, valid_until, features: [...], activation_id }
  Response (Fehler):
    { valid: false, error: "invalid_key|expired|max_activations|suspended", message }
"""
import os, hmac as _hmac, hashlib, base64, json, socket, logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import httpx
from database import get_db
from models import Setting

router    = APIRouter()
logger    = logging.getLogger(__name__)

LICENSE_SERVER    = os.getenv("LICENSE_SERVER_URL", "https://monstersuite.de")
LICENSE_SECRET    = os.getenv("LICENSE_SECRET", "")       # nur für Offline-/Dev-Keys
GRACE_DAYS        = int(os.getenv("LICENSE_GRACE_DAYS", "14"))
CACHE_TTL_HOURS   = 24
PRODUCT_SLUG      = "signaturmonster"
VERSION           = "0.6.0"

# ─── Feature-Definitionen ─────────────────────────────────────────────────────
ALL_FEATURES = [
    {"id": "smtp_basic",  "name": "SMTP-Konfiguration",    "description": "E-Mail-Weiterleitung über Relay-Server",          "category": "Konfiguration", "free": True},
    {"id": "signatures",  "name": "Signatur-Designer",      "description": "Visueller Block-Editor für E-Mail-Signaturen",    "category": "Signaturen",    "free": True},
    {"id": "rules",       "name": "Signatur-Regeln",        "description": "Regelbasierte Signaturzuweisung nach Absender",   "category": "Signaturen",    "free": True},
    {"id": "smtp_multi",  "name": "Mehrere SMTP-Konten",    "description": "Unbegrenzte Relay-Konten mit Domain-Matching",    "category": "Konfiguration", "free": False},
    {"id": "ci_branding", "name": "CI-Profile & Branding",  "description": "Mail-Beautifier mit Corporate-Identity-Wrapper",  "category": "Signaturen",    "free": False},
    {"id": "senders",     "name": "Mailadressen-Profile",   "description": "Personalisierte Absenderprofile mit Variablen",   "category": "Signaturen",    "free": False},
    {"id": "disclaimer",  "name": "Disclaimer-Verwaltung",  "description": "Zentral verwaltete Rechtstexte je Regel",         "category": "Signaturen",    "free": False},
    {"id": "banners",     "name": "Banner-Bibliothek",      "description": "Wiederverwendbare Kampagnen-Banner",              "category": "Signaturen",    "free": False},
    {"id": "templates",   "name": "Angebots-Templates",     "description": "HTML-Vorlagen für Lexware & JTL-Wawi",            "category": "Templates",     "free": False},
    {"id": "user_mgmt",   "name": "Benutzerverwaltung",     "description": "Mehrere Administratoren anlegen und verwalten",   "category": "Konfiguration", "free": False},
]
FREE_FEATURES = {f["id"] for f in ALL_FEATURES if f["free"]}

# ─── Machine-ID ───────────────────────────────────────────────────────────────
def _machine_id() -> str:
    try:
        import uuid
        raw = f"{socket.gethostname()}-{uuid.getnode()}-{PRODUCT_SLUG}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]
    except Exception:
        return hashlib.sha256(PRODUCT_SLUG.encode()).hexdigest()[:32]

# ─── Offline-Validierung (HMAC, nur wenn LICENSE_SECRET gesetzt) ──────────────
def _validate_offline(key: str) -> Optional[dict]:
    if not LICENSE_SECRET:
        return None
    try:
        parts = key.strip().split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected = _hmac.new(LICENSE_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not _hmac.compare_digest(expected, sig):
            return None
        pad = (4 - len(payload_b64) % 4) % 4
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * pad).decode())
        if payload.get("expires") and datetime.fromisoformat(payload["expires"]) < datetime.utcnow():
            return {"valid": False, "error": "expired", "message": "Offline-Key abgelaufen"}
        return {
            "valid":       True,
            "plan":        payload.get("plan", "pro"),
            "email":       payload.get("email", ""),
            "valid_until": payload.get("expires"),
            "features":    payload.get("features", []),
            "_offline":    True,
        }
    except Exception:
        return None

# ─── Online-Validierung (monstersuite.de) ─────────────────────────────────────
async def _validate_online(key: str, email: str, endpoint: str = "activate") -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                f"{LICENSE_SERVER}/api/v1/licenses/{endpoint}",
                json={
                    "license_key": key,
                    "email":       email,
                    "machine_id":  _machine_id(),
                    "hostname":    socket.gethostname(),
                    "product":     PRODUCT_SLUG,
                    "version":     VERSION,
                },
            )
            return r.json()
    except Exception as e:
        logger.warning(f"License server not reachable ({LICENSE_SERVER}): {e}")
        return None

# ─── DB-Helpers ───────────────────────────────────────────────────────────────
async def _get(db: AsyncSession, key: str) -> str:
    s = await db.get(Setting, key)
    return s.value if s else ""

async def _set(db: AsyncSession, key: str, value: str):
    s = await db.get(Setting, key)
    if s:
        s.value = value
    else:
        db.add(Setting(key=key, value=value))

async def _load_cache(db) -> Optional[dict]:
    raw = await _get(db, "license_cache_json")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None

async def _save_cache(db, data: dict):
    await _set(db, "license_cache_json", json.dumps(data))
    await _set(db, "license_cache_at", datetime.utcnow().isoformat())

async def _cache_age_hours(db) -> Optional[float]:
    ts = await _get(db, "license_cache_at")
    if not ts:
        return None
    try:
        return (datetime.utcnow() - datetime.fromisoformat(ts)).total_seconds() / 3600
    except Exception:
        return None

# ─── Kern-Logik: aktuellen Lizenzstatus ermitteln ─────────────────────────────
async def _resolve_license(db) -> dict:
    key   = await _get(db, "license_key")
    email = await _get(db, "license_email")

    free_response = {
        "status":           "free",
        "plan":             "Kostenlos",
        "email":            None,
        "valid_until":      None,
        "last_check":       None,
        "grace_remaining":  None,
        "validation_mode":  "none",
        "machine_id":       _machine_id(),
        "active_features":  sorted(FREE_FEATURES),
        "features":         ALL_FEATURES,
    }

    if not key:
        return free_response

    cache     = await _load_cache(db)
    age_hours = await _cache_age_hours(db)

    # Cache noch frisch → direkt zurückgeben
    if cache and age_hours is not None and age_hours < CACHE_TTL_HOURS:
        return _build_response(cache, age_hours, "cached", email)

    # Cache veraltet → Server anfragen
    result = await _validate_online(key, email, endpoint="validate")

    if result and result.get("valid"):
        await _save_cache(db, result)
        return _build_response(result, 0, "online", email)

    # Server nicht erreichbar
    if cache:
        grace_hours    = GRACE_DAYS * 24
        grace_used     = age_hours or 0
        grace_remaining_days = max(0, (grace_hours - grace_used) / 24)

        if grace_used < grace_hours:
            logger.warning(f"License server unreachable — grace period: {grace_remaining_days:.1f} days remaining")
            return _build_response(cache, age_hours, "grace", email,
                                   grace_remaining=round(grace_remaining_days, 1))

        logger.warning("License grace period expired — reverting to free plan")
        return {**free_response, "status": "grace_expired",
                "plan": "Grace Period abgelaufen", "email": email}

    # Gar kein Cache → ungültig
    return {**free_response, "status": "invalid", "plan": "Ungültig", "email": email}


def _build_response(server_data: dict, age_hours: Optional[float],
                    mode: str, stored_email: str,
                    grace_remaining: Optional[float] = None) -> dict:
    expired = False
    if server_data.get("valid_until"):
        try:
            expired = datetime.fromisoformat(server_data["valid_until"]) < datetime.utcnow()
        except Exception:
            pass

    active = set(FREE_FEATURES)
    if not expired:
        active.update(server_data.get("features", []))

    last_check = None
    if age_hours is not None:
        last_check = (datetime.utcnow() - timedelta(hours=age_hours)).isoformat(timespec="minutes")

    return {
        "status":          "expired" if expired else ("grace" if grace_remaining is not None else "active"),
        "plan":            server_data.get("plan", "Pro"),
        "email":           server_data.get("email", stored_email),
        "valid_until":     server_data.get("valid_until"),
        "last_check":      last_check,
        "grace_remaining": grace_remaining,
        "validation_mode": mode,
        "machine_id":      _machine_id(),
        "active_features": sorted(active),
        "features":        ALL_FEATURES,
        "_offline":        server_data.get("_offline", False),
    }

# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/")
async def get_license(db: AsyncSession = Depends(get_db)):
    return await _resolve_license(db)

class ActivateRequest(BaseModel):
    key: str
    email: str

@router.post("/activate")
async def activate(req: ActivateRequest, db: AsyncSession = Depends(get_db)):
    key   = req.key.strip()
    email = req.email.strip()

    if not key or not email:
        return {"ok": False, "error": "Bitte Key und E-Mail eingeben"}

    # 1. Online-Aktivierung versuchen
    result = await _validate_online(key, email, endpoint="activate")

    if result is None:
        # Server nicht erreichbar → Offline-Fallback
        offline = _validate_offline(key)
        if offline and offline.get("valid"):
            await _set(db, "license_key",   key)
            await _set(db, "license_email", email)
            await _save_cache(db, offline)
            await db.commit()
            return {"ok": True, "plan": offline.get("plan", "offline"),
                    "mode": "offline", "features": offline.get("features", [])}
        return {"ok": False, "error": f"Lizenzserver ({LICENSE_SERVER}) nicht erreichbar und kein gültiger Offline-Key"}

    if not result.get("valid"):
        return {"ok": False, "error": result.get("message") or result.get("error") or "Aktivierung fehlgeschlagen"}

    await _set(db, "license_key",   key)
    await _set(db, "license_email", email)
    await _save_cache(db, result)
    await db.commit()
    return {"ok": True, "plan": result.get("plan"), "mode": "online",
            "features": result.get("features", []), "email": result.get("email")}

@router.post("/refresh")
async def refresh(db: AsyncSession = Depends(get_db)):
    """Erzwingt sofortige Neuvalidierung gegen den Server."""
    key   = await _get(db, "license_key")
    email = await _get(db, "license_email")
    if not key:
        return {"ok": False, "error": "Kein Lizenzschlüssel gespeichert"}
    result = await _validate_online(key, email, endpoint="validate")
    if result and result.get("valid"):
        await _save_cache(db, result)
        await db.commit()
        return {"ok": True, "plan": result.get("plan"), "checked_at": datetime.utcnow().isoformat()}
    return {"ok": False, "error": "Server nicht erreichbar oder Lizenz ungültig"}

@router.delete("/")
async def deactivate(db: AsyncSession = Depends(get_db)):
    for k in ("license_key", "license_email", "license_cache_json", "license_cache_at"):
        await _set(db, k, "")
    await db.commit()
    return {"ok": True}

# ─── Feature-Guard (Dependency) ──────────────────────────────────────────────
def require_feature(feature_id: str):
    """FastAPI-Dependency-Factory: prüft ob ein Feature in der aktiven Lizenz enthalten ist."""
    async def _check(db: AsyncSession = Depends(get_db)):
        try:
            lic = await _resolve_license(db)
            active = lic.get("active_features") or []
            if feature_id not in active:
                raise HTTPException(
                    status_code=402,
                    detail=f"Feature '{feature_id}' nicht lizenziert — Upgrade: monstersuite.de",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"require_feature({feature_id!r}) error: {exc}", exc_info=True)
            raise HTTPException(
                status_code=402,
                detail=f"Feature '{feature_id}' nicht lizenziert — Upgrade: monstersuite.de",
            )
    return _check

# ─── Offline-Key-Generator (Entwicklung / Demo) ───────────────────────────────
def generate_offline_key(email: str, features: list[str],
                         plan: str = "pro", expires: Optional[str] = None) -> str:
    """Erzeugt einen signierten Offline-Key (nur für Dev/Demo, LICENSE_SECRET muss gesetzt sein)."""
    if not LICENSE_SECRET:
        raise ValueError("LICENSE_SECRET ist nicht gesetzt")
    payload = {"email": email, "plan": plan, "features": features,
               "issued": datetime.utcnow().date().isoformat()}
    if expires:
        payload["expires"] = expires
    b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()
    sig = _hmac.new(LICENSE_SECRET.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"
