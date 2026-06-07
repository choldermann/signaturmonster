from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import SenderProfile

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

class SenderOut(SenderIn):
    id: int
    class Config:
        from_attributes = True

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
