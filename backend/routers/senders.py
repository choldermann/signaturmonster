from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import SenderProfile
from routers.auth import get_current_user_id

router = APIRouter()

class SenderIn(BaseModel):
    email: str
    first_name: str = ""
    last_name: str = ""
    job_title: str = ""
    photo_url: str = ""
    phone: str = ""
    mobile: str = ""
    street: str = ""
    postal_code: str = ""
    city: str = ""
    country: str = ""
    company: str = ""

class SenderOut(BaseModel):
    id: int
    email: str
    first_name: str = ""
    last_name: str = ""
    job_title: str = ""
    photo_url: str = ""
    phone: str = ""
    mobile: str = ""
    street: str = ""
    postal_code: str = ""
    city: str = ""
    country: str = ""
    company: str = ""
    claimed_by_user_id: Optional[int] = None
    class Config:
        from_attributes = True

class SelfServiceUpdate(BaseModel):
    first_name: str = ""
    last_name: str = ""
    job_title: str = ""
    photo_url: str = ""
    phone: str = ""
    mobile: str = ""
    street: str = ""
    postal_code: str = ""
    city: str = ""
    country: str = ""
    company: str = ""

# ── Self-Service (eigenes Profil) ─────────────────────────────────────────────

@router.get("/unclaimed", response_model=list[SenderOut])
async def list_unclaimed(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SenderProfile)
        .where(SenderProfile.claimed_by_user_id == None)
        .order_by(SenderProfile.last_name, SenderProfile.first_name)
    )
    return result.scalars().all()

@router.get("/me", response_model=Optional[SenderOut])
async def get_my_profile(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SenderProfile).where(SenderProfile.claimed_by_user_id == user_id)
    )
    return result.scalar_one_or_none()

@router.post("/me/claim/{sender_id}", response_model=SenderOut)
async def claim_profile(
    sender_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(SenderProfile).where(SenderProfile.claimed_by_user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Du hast bereits ein verknüpftes Profil")
    result = await db.execute(select(SenderProfile).where(SenderProfile.id == sender_id))
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(404, "Profil nicht gefunden")
    if sender.claimed_by_user_id is not None:
        raise HTTPException(409, "Dieses Profil ist bereits verknüpft")
    sender.claimed_by_user_id = user_id
    await db.commit()
    await db.refresh(sender)
    return sender

@router.delete("/me/claim")
async def release_claim(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SenderProfile).where(SenderProfile.claimed_by_user_id == user_id)
    )
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(404, "Kein verknüpftes Profil")
    sender.claimed_by_user_id = None
    await db.commit()
    return {"ok": True}

@router.put("/me", response_model=SenderOut)
async def update_my_profile(
    data: SelfServiceUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SenderProfile).where(SenderProfile.claimed_by_user_id == user_id)
    )
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(404, "Kein verknüpftes Profil")
    for k, v in data.model_dump().items():
        setattr(sender, k, v)
    await db.commit()
    await db.refresh(sender)
    return sender

# ── Admin CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[SenderOut])
async def list_senders(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SenderProfile).order_by(SenderProfile.last_name, SenderProfile.first_name))
    return result.scalars().all()

@router.post("/", response_model=SenderOut)
async def create_sender(data: SenderIn, db: AsyncSession = Depends(get_db)):
    sender = SenderProfile(**data.model_dump())
    db.add(sender)
    await db.commit()
    await db.refresh(sender)
    return sender

@router.put("/{sender_id}", response_model=SenderOut)
async def update_sender(sender_id: int, data: SenderIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SenderProfile).where(SenderProfile.id == sender_id))
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(404, "Sender not found")
    for k, v in data.model_dump().items():
        setattr(sender, k, v)
    await db.commit()
    await db.refresh(sender)
    return sender

@router.delete("/{sender_id}")
async def delete_sender(sender_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SenderProfile).where(SenderProfile.id == sender_id))
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(404, "Sender not found")
    await db.delete(sender)
    await db.commit()
    return {"ok": True}

@router.get("/by-email/{email}", response_model=Optional[SenderOut])
async def get_by_email(email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SenderProfile).where(SenderProfile.email == email))
    return result.scalar_one_or_none()
