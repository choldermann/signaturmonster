from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sql_delete
from datetime import datetime, timedelta
from pydantic import BaseModel
from database import get_db
from models import SenderSlot
from routers.license import get_sender_limit

router = APIRouter()

_SYSTEM_PREFIXES = ("postmaster@", "mailer-daemon@", "no-reply@", "noreply@", "bounce@", "daemon@")

def _is_system(email: str) -> bool:
    e = email.lower()
    return any(e.startswith(p) for p in _SYSTEM_PREFIXES)

def _cutoff() -> datetime:
    return datetime.utcnow() - timedelta(days=30)


@router.get("/usage")
async def get_usage(db: AsyncSession = Depends(get_db)):
    cut = _cutoff()
    result = await db.execute(
        select(func.count()).select_from(SenderSlot).where(SenderSlot.last_seen >= cut)
    )
    current = result.scalar() or 0
    limit   = await get_sender_limit(db)
    pct     = round(current / limit * 100) if limit else 0
    return {
        "current":   current,
        "limit":     limit,
        "unlimited": limit is None,
        "pct":       pct,
        "warning":   (limit is not None and pct >= 80),
        "exceeded":  (limit is not None and current >= limit),
    }


@router.get("/")
async def list_sender_slots(db: AsyncSession = Depends(get_db)):
    cut    = _cutoff()
    result = await db.execute(
        select(SenderSlot).where(SenderSlot.last_seen >= cut).order_by(SenderSlot.last_seen.desc())
    )
    slots = result.scalars().all()
    return [
        {
            "email":      s.email,
            "first_seen": s.first_seen.isoformat() if s.first_seen else None,
            "last_seen":  s.last_seen.isoformat()  if s.last_seen  else None,
            "mail_count": s.mail_count,
        }
        for s in slots
    ]


class TouchRequest(BaseModel):
    email: str


@router.post("/touch")
async def touch_sender(req: TouchRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.lower().strip()
    if not email or "@" not in email or _is_system(email):
        return {"ok": True, "skipped": True}

    cut = _cutoff()
    now = datetime.utcnow()

    # Bereits aktiver Slot → nur aktualisieren, kein Limit-Check nötig
    result = await db.execute(
        select(SenderSlot).where(SenderSlot.email == email, SenderSlot.last_seen >= cut)
    )
    active_slot = result.scalar_one_or_none()
    if active_slot:
        active_slot.last_seen  = now
        active_slot.mail_count += 1
        await db.commit()
        return {"ok": True, "limit_reached": False}

    # Neuer oder abgelaufener Sender → Limit prüfen
    limit = await get_sender_limit(db)
    if limit is not None:
        count_res = await db.execute(
            select(func.count()).select_from(SenderSlot).where(SenderSlot.last_seen >= cut)
        )
        current = count_res.scalar() or 0
        if current >= limit:
            return {"ok": True, "limit_reached": True, "current": current, "limit": limit}

    # Einfügen oder reaktivieren
    result2 = await db.execute(select(SenderSlot).where(SenderSlot.email == email))
    slot    = result2.scalar_one_or_none()
    if slot:
        slot.last_seen  = now
        slot.mail_count += 1
    else:
        db.add(SenderSlot(email=email, first_seen=now, last_seen=now, mail_count=1))

    await db.commit()
    return {"ok": True, "limit_reached": False}


@router.delete("/clear")
async def delete_all_sender_slots(db: AsyncSession = Depends(get_db)):
    await db.execute(sql_delete(SenderSlot))
    await db.commit()
    return {"ok": True}


@router.delete("/{email:path}")
async def delete_sender_slot(email: str, db: AsyncSession = Depends(get_db)):
    await db.execute(sql_delete(SenderSlot).where(SenderSlot.email == email.lower()))
    await db.commit()
    return {"ok": True}
