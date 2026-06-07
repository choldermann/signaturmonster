from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Signature
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class SignatureCreate(BaseModel):
    name: str
    html_content: str = ""
    text_content: str = ""
    is_default: bool = False
    designer_json: Optional[str] = None

class SignatureOut(SignatureCreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[SignatureOut])
async def list_signatures(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Signature))
    return result.scalars().all()

@router.post("/", response_model=SignatureOut)
async def create_signature(data: SignatureCreate, db: AsyncSession = Depends(get_db)):
    sig = Signature(**data.model_dump())
    db.add(sig)
    await db.commit()
    await db.refresh(sig)
    return sig

@router.put("/{sig_id}", response_model=SignatureOut)
async def update_signature(sig_id: int, data: SignatureCreate, db: AsyncSession = Depends(get_db)):
    sig = await db.get(Signature, sig_id)
    if not sig: raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(sig, k, v)
    await db.commit()
    await db.refresh(sig)
    return sig

@router.delete("/{sig_id}")
async def delete_signature(sig_id: int, db: AsyncSession = Depends(get_db)):
    sig = await db.get(Signature, sig_id)
    if not sig: raise HTTPException(404, "Not found")
    await db.delete(sig)
    await db.commit()
    return {"ok": True}
