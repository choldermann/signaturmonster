"""
Offer rendering endpoint: SMTP-Proxy → /api/offers/render?subject=...
Backend holt Lexware-Daten, rendert das konfigurierte Template, gibt HTML zurück.
"""
import json
import re
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import Setting, Template
from services.lexware import LexwareService
from services.template_renderer import render_template, SAMPLE_DATA

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get(db: AsyncSession, key: str, default: str = "") -> str:
    s = await db.get(Setting, key)
    return s.value if s and s.value else default


async def _set(db: AsyncSession, key: str, value: str):
    s = await db.get(Setting, key)
    if s:
        s.value = value
    else:
        db.add(Setting(key=key, value=value))
    await db.commit()


class OfferConfig(BaseModel):
    lexware_api_token:    str = ""
    offer_template_id:    str = ""
    offer_subject_pattern: str = r"[A-Z]{2,6}-\d{4}-\d+"
    offer_enabled:        bool = False


@router.get("/config")
async def get_offer_config(db: AsyncSession = Depends(get_db)):
    token = await _get(db, "lexware_api_token")
    return {
        "lexware_api_token":     ("*" * 8 + token[-4:]) if len(token) > 4 else ("*" * len(token) if token else ""),
        "lexware_token_set":     bool(token),
        "offer_template_id":     await _get(db, "offer_template_id"),
        "offer_subject_pattern": await _get(db, "offer_subject_pattern", r"[A-Z]{2,6}-\d{4}-\d+"),
        "offer_enabled":         (await _get(db, "offer_enabled", "false")) == "true",
    }


@router.put("/config")
async def update_offer_config(data: OfferConfig, db: AsyncSession = Depends(get_db)):
    if data.lexware_api_token and not data.lexware_api_token.startswith("*"):
        await _set(db, "lexware_api_token", data.lexware_api_token)
    await _set(db, "offer_template_id",     data.offer_template_id)
    await _set(db, "offer_subject_pattern", data.offer_subject_pattern or r"[A-Z]{2,6}-\d{4}-\d+")
    await _set(db, "offer_enabled",         "true" if data.offer_enabled else "false")
    return {"ok": True}


@router.get("/render")
async def render_offer(
    subject: str = Query(""),
    angebotsnummer: str = Query(""),
    template_id: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    """
    Wird vom SMTP-Proxy aufgerufen. Gibt {"html": "...", "found": true/false} zurück.
    - subject: voller E-Mail-Betreff (Proxy extrahiert Nummer selbst nicht)
    - angebotsnummer: direkt gesetzt (für manuelle Aufrufe / Test-Preview)
    - template_id: optional; sonst wird offer_template_id aus Settings verwendet
    """
    enabled = (await _get(db, "offer_enabled", "false")) == "true"
    if not enabled and not angebotsnummer:
        return {"html": "", "found": False, "reason": "disabled"}

    pattern = await _get(db, "offer_subject_pattern", r"[A-Z]{2,6}-\d{4}-\d+")
    number  = angebotsnummer

    if not number and subject:
        try:
            m = re.search(pattern, subject)
            if m:
                number = m.group(0)
        except re.error as e:
            logger.warning(f"offer_subject_pattern ungültig: {e}")

    if not number:
        return {"html": "", "found": False, "reason": "no_number_in_subject"}

    tmpl_id = template_id or await _get(db, "offer_template_id")
    if not tmpl_id:
        return {"html": "", "found": False, "reason": "no_template_configured"}

    try:
        tmpl = await db.get(Template, int(tmpl_id))
    except Exception:
        tmpl = None
    if not tmpl:
        return {"html": "", "found": False, "reason": "template_not_found"}

    blocks = json.loads(tmpl.blocks_json or "[]")

    # Lexware-Daten holen (falls Token gesetzt)
    token = await _get(db, "lexware_api_token")
    data  = dict(SAMPLE_DATA)  # Fallback auf Beispieldaten

    if token:
        try:
            svc    = LexwareService(token)
            result = await svc.get_quotation_detail_by_number(number)
            if result:
                data = result
            else:
                logger.info(f"Lexware: Kein Angebot für '{number}' gefunden — Vorschau mit Beispieldaten")
        except Exception as e:
            logger.error(f"Lexware-Fehler bei '{number}': {e}")
    else:
        logger.info("Kein Lexware-Token konfiguriert — render mit Beispieldaten")

    html = render_template(blocks, data)
    return {"html": html, "found": True, "angebotsnummer": number}


@router.get("/preview/{template_id}")
async def preview_offer(template_id: int, db: AsyncSession = Depends(get_db)):
    """Vorschau mit SAMPLE_DATA (kein Lexware-Zugriff)."""
    tmpl = await db.get(Template, template_id)
    if not tmpl:
        return {"html": "", "found": False}
    blocks = json.loads(tmpl.blocks_json or "[]")
    return {"html": render_template(blocks, SAMPLE_DATA), "found": True}
