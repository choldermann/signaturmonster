"""
Signaturmonster — Thunderbird Addon API

Liefert eine vorgerenderte Signatur-Vorschau für einen gegebenen Absender.
Wird vom Thunderbird-Addon genutzt, um die Signatur live im Compose-Fenster anzuzeigen.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Rule, Signature, SenderProfile
from routers.auth import get_current_user_id

router = APIRouter()


def _render(template: str, data: dict) -> str:
    for k, v in data.items():
        template = template.replace(f"{{{{{k}}}}}", str(v or ""))
    return template


def _sender_context(profile: SenderProfile | None, email: str) -> dict:
    first = (profile.first_name or "") if profile else ""
    last  = (profile.last_name  or "") if profile else ""
    if profile:
        addr_parts = [p for p in [
            profile.street,
            f"{profile.postal_code or ''} {profile.city or ''}".strip(),
            profile.country,
        ] if p]
    else:
        addr_parts = []

    return {
        "vorname":           first,
        "nachname":          last,
        "name":              f"{first} {last}".strip(),
        "email":             email,
        "berufsbezeichnung": (profile.job_title   or "") if profile else "",
        "firma":             (profile.company      or "") if profile else "",
        "telefon":           (profile.phone        or "") if profile else "",
        "mobil":             (profile.mobile       or "") if profile else "",
        "strasse":           (profile.street       or "") if profile else "",
        "plz":               (profile.postal_code  or "") if profile else "",
        "ort":               (profile.city         or "") if profile else "",
        "land":              (profile.country      or "") if profile else "",
        "adresse":           ", ".join(addr_parts),
        "foto":              (profile.photo_url    or "") if profile else "",
        # These are injected at send time; show placeholder in preview
        "disclaimer_html":   "<em style='color:#aaa;font-size:11px;'>[Disclaimer]</em>",
        "disclaimer_text":   "[Disclaimer]",
        "campaign_banner":   "",
        "campaign_banner_text": "",
    }


@router.get("/preview")
async def preview(
    sender: str = Query(..., description="E-Mail-Adresse des Absenders"),
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """
    Gibt die gerenderte Signatur-HTML für einen Absender zurück.
    Das Addon zeigt sie als Live-Vorschau im Compose-Fenster an.
    """
    email  = sender.strip().lower()
    domain = email.split("@")[-1] if "@" in email else ""

    result = await db.execute(
        select(Rule).where(Rule.is_active == True).order_by(Rule.priority)
    )
    matched_rule = None
    for rule in result.scalars().all():
        if not rule.apply_on_new:
            continue
        match = (
            (rule.match_sender and rule.match_sender.lower() == email) or
            (rule.match_domain and rule.match_domain.lower() == domain) or
            (not rule.match_sender and not rule.match_domain)
        )
        if match:
            matched_rule = rule
            break

    if not matched_rule or not matched_rule.signature_id:
        return {"has_rule": False, "html": "", "text": "", "rule_name": "", "has_ci": False}

    sig = await db.get(Signature, matched_rule.signature_id)
    if not sig:
        return {"has_rule": False, "html": "", "text": "", "rule_name": "", "has_ci": False}

    profile_result = await db.execute(
        select(SenderProfile).where(SenderProfile.email == email)
    )
    profile = profile_result.scalar_one_or_none()
    ctx     = _sender_context(profile, email)

    html = _render(sig.html_content or "", ctx)
    text = _render(sig.text_content or "", ctx)

    return {
        "has_rule":       True,
        "html":           html,
        "text":           text,
        "rule_name":      matched_rule.name,
        "signature_name": sig.name,
        "has_ci":         bool(matched_rule.ci_config_id),
    }
