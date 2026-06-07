from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import Banner

router = APIRouter()

class BannerIn(BaseModel):
    name: str
    props_json: str = "{}"

class BannerOut(BannerIn):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[BannerOut])
async def list_banners(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Banner).order_by(Banner.name))
    return result.scalars().all()

@router.post("/", response_model=BannerOut)
async def create_banner(data: BannerIn, db: AsyncSession = Depends(get_db)):
    b = Banner(**data.model_dump())
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b

@router.get("/{banner_id}", response_model=BannerOut)
async def get_banner(banner_id: int, db: AsyncSession = Depends(get_db)):
    b = await db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Not found")
    return b

@router.put("/{banner_id}", response_model=BannerOut)
async def update_banner(banner_id: int, data: BannerIn, db: AsyncSession = Depends(get_db)):
    b = await db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(b, k, v)
    await db.commit()
    await db.refresh(b)
    return b

@router.delete("/{banner_id}")
async def delete_banner(banner_id: int, db: AsyncSession = Depends(get_db)):
    b = await db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Not found")
    await db.delete(b)
    await db.commit()
    return {"ok": True}
