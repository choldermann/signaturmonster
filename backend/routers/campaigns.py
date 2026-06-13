import random
from datetime import datetime, timezone
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException
from routers.license import require_feature as _rf
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Campaign, Setting

router = APIRouter()


class CampaignIn(BaseModel):
    name:            str
    is_active:       bool              = True
    start_date:      Optional[str]     = None   # ISO date string or null
    end_date:        Optional[str]     = None
    image_asset_id:  Optional[int]     = None
    link_url:        str               = ""
    utm_source:      str               = "email"
    utm_medium:      str               = "email"
    utm_campaign:    str               = ""
    utm_content:     str               = ""


class CampaignOut(BaseModel):
    id:              int
    name:            str
    is_active:       bool
    start_date:      Optional[str]
    end_date:        Optional[str]
    image_asset_id:  Optional[int]
    link_url:        str
    utm_source:      str
    utm_medium:      str
    utm_campaign:    str
    utm_content:     str
    click_count:     int
    impression_count: int
    created_at:      Optional[str]

    class Config:
        from_attributes = True


def _dt_str(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _campaign_out(c: Campaign) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "is_active": c.is_active,
        "start_date": _dt_str(c.start_date),
        "end_date": _dt_str(c.end_date),
        "image_asset_id": c.image_asset_id,
        "link_url": c.link_url or "",
        "utm_source": c.utm_source or "",
        "utm_medium": c.utm_medium or "",
        "utm_campaign": c.utm_campaign or "",
        "utm_content": c.utm_content or "",
        "click_count": c.click_count or 0,
        "impression_count": c.impression_count or 0,
        "created_at": _dt_str(c.created_at),
    }


def _build_utm_url(c: Campaign) -> str:
    url = c.link_url or "/"
    params = {}
    if c.utm_source:   params["utm_source"]   = c.utm_source
    if c.utm_medium:   params["utm_medium"]   = c.utm_medium
    if c.utm_campaign: params["utm_campaign"] = c.utm_campaign
    if c.utm_content:  params["utm_content"]  = c.utm_content
    if not params:
        return url
    sep = "&" if "?" in url else "?"
    return url + sep + urlencode(params)


async def _get_server_url(db: AsyncSession) -> str:
    res = await db.execute(select(Setting).where(Setting.key == "signaturmonster_url"))
    s = res.scalar_one_or_none()
    return (s.value.rstrip("/") if s and s.value else "")


# ── CRUD ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[CampaignOut], dependencies=[Depends(_rf("banners"))])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return [_campaign_out(c) for c in res.scalars().all()]


@router.post("/", response_model=CampaignOut, dependencies=[Depends(_rf("banners"))])
async def create_campaign(data: CampaignIn, db: AsyncSession = Depends(get_db)):
    c = Campaign(
        name=data.name, is_active=data.is_active,
        start_date=_parse_dt(data.start_date), end_date=_parse_dt(data.end_date),
        image_asset_id=data.image_asset_id, link_url=data.link_url,
        utm_source=data.utm_source, utm_medium=data.utm_medium,
        utm_campaign=data.utm_campaign, utm_content=data.utm_content,
        click_count=0, impression_count=0,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _campaign_out(c)


@router.put("/{campaign_id}", response_model=CampaignOut, dependencies=[Depends(_rf("banners"))])
async def update_campaign(campaign_id: int, data: CampaignIn, db: AsyncSession = Depends(get_db)):
    c = await db.get(Campaign, campaign_id)
    if not c:
        raise HTTPException(404, "Not found")
    c.name = data.name
    c.is_active = data.is_active
    c.start_date = _parse_dt(data.start_date)
    c.end_date = _parse_dt(data.end_date)
    c.image_asset_id = data.image_asset_id
    c.link_url = data.link_url
    c.utm_source = data.utm_source
    c.utm_medium = data.utm_medium
    c.utm_campaign = data.utm_campaign
    c.utm_content = data.utm_content
    await db.commit()
    await db.refresh(c)
    return _campaign_out(c)


@router.delete("/{campaign_id}", dependencies=[Depends(_rf("banners"))])
async def delete_campaign(campaign_id: int, db: AsyncSession = Depends(get_db)):
    c = await db.get(Campaign, campaign_id)
    if not c:
        raise HTTPException(404, "Not found")
    await db.delete(c)
    await db.commit()
    return {"ok": True}


# ── Pick (SMTP Proxy) ────────────────────────────────────────────────────────

@router.get("/pick")
async def pick_campaign(db: AsyncSession = Depends(get_db)):
    """Zufällige aktive Kampagne für SMTP-Proxy. Zählt Impressions."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    res = await db.execute(
        select(Campaign).where(
            Campaign.is_active == True,
            or_(Campaign.start_date == None, Campaign.start_date <= now),
            or_(Campaign.end_date == None, Campaign.end_date >= now),
        )
    )
    campaigns = res.scalars().all()
    if not campaigns:
        return {"html": "", "text": "", "campaign_id": None}

    c = random.choice(campaigns)
    c.impression_count = (c.impression_count or 0) + 1
    await db.commit()

    server_url = await _get_server_url(db)

    if not c.image_asset_id:
        return {"html": "", "text": "", "campaign_id": c.id}

    img_url = (
        f"{server_url}/api/images/{c.image_asset_id}/serve"
        if server_url else
        f"/api/images/{c.image_asset_id}/serve"
    )

    if server_url and c.link_url:
        click_url = f"{server_url}/api/campaigns/{c.id}/track"
    else:
        click_url = _build_utm_url(c)

    html = (
        f'<a href="{click_url}" target="_blank" '
        f'style="display:block;text-decoration:none;line-height:0;">'
        f'<img src="{img_url}" alt="" border="0" '
        f'style="display:block;max-width:600px;width:100%;border:0;" /></a>'
    )
    return {"html": html, "text": click_url if c.link_url else "", "campaign_id": c.id}


# ── Click Tracking (public) ──────────────────────────────────────────────────

@router.get("/{campaign_id}/track")
async def track_click(campaign_id: int, db: AsyncSession = Depends(get_db)):
    """Klick-Tracking: zählt Klick und leitet zur Ziel-URL weiter."""
    c = await db.get(Campaign, campaign_id)
    if not c:
        return RedirectResponse(url="/", status_code=302)
    c.click_count = (c.click_count or 0) + 1
    await db.commit()
    return RedirectResponse(url=_build_utm_url(c) or "/", status_code=302)
