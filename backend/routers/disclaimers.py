from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import Disclaimer

router = APIRouter()

class DisclaimerIn(BaseModel):
    name: str
    html_content: str = ""
    text_content: str = ""

class DisclaimerOut(DisclaimerIn):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[DisclaimerOut])
async def list_disclaimers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Disclaimer).order_by(Disclaimer.name))
    return result.scalars().all()

@router.post("/", response_model=DisclaimerOut)
async def create_disclaimer(data: DisclaimerIn, db: AsyncSession = Depends(get_db)):
    d = Disclaimer(**data.model_dump())
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d

@router.get("/{disclaimer_id}", response_model=DisclaimerOut)
async def get_disclaimer(disclaimer_id: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(Disclaimer, disclaimer_id)
    if not d:
        raise HTTPException(404, "Not found")
    return d

@router.put("/{disclaimer_id}", response_model=DisclaimerOut)
async def update_disclaimer(disclaimer_id: int, data: DisclaimerIn, db: AsyncSession = Depends(get_db)):
    d = await db.get(Disclaimer, disclaimer_id)
    if not d:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(d, k, v)
    await db.commit()
    await db.refresh(d)
    return d

@router.delete("/{disclaimer_id}")
async def delete_disclaimer(disclaimer_id: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(Disclaimer, disclaimer_id)
    if not d:
        raise HTTPException(404, "Not found")
    await db.delete(d)
    await db.commit()
    return {"ok": True}
