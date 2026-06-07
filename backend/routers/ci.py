from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import CIConfig
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CICreate(BaseModel):
    name: str
    primary_color: str = "#fce499"
    text_color: str = "#333333"
    bg_color: str = "#ffffff"
    header_bg: str = "#242424"
    font_family: str = "Arial, Helvetica, sans-serif"
    font_size: str = "14px"
    line_height: str = "1.6"
    container_width: str = "620"
    logo_url: str = ""
    company_name: str = ""
    show_header: bool = True
    show_footer: bool = True
    footer_text: str = ""
    content_bg: str = "#ffffff"
    border: str = "1px solid #dddddd"

class CIOut(CICreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[CIOut])
async def list_ci(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CIConfig))
    return result.scalars().all()

@router.get("/{ci_id}", response_model=CIOut)
async def get_ci(ci_id: int, db: AsyncSession = Depends(get_db)):
    ci = await db.get(CIConfig, ci_id)
    if not ci: raise HTTPException(404, "Not found")
    return ci

@router.post("/", response_model=CIOut)
async def create_ci(data: CICreate, db: AsyncSession = Depends(get_db)):
    ci = CIConfig(**data.model_dump())
    db.add(ci)
    await db.commit()
    await db.refresh(ci)
    return ci

@router.put("/{ci_id}", response_model=CIOut)
async def update_ci(ci_id: int, data: CICreate, db: AsyncSession = Depends(get_db)):
    ci = await db.get(CIConfig, ci_id)
    if not ci: raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(ci, k, v)
    await db.commit()
    await db.refresh(ci)
    return ci

@router.delete("/{ci_id}")
async def delete_ci(ci_id: int, db: AsyncSession = Depends(get_db)):
    ci = await db.get(CIConfig, ci_id)
    if not ci: raise HTTPException(404, "Not found")
    await db.delete(ci)
    await db.commit()
    return {"ok": True}
