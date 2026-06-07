from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Template
from pydantic import BaseModel
import json

router = APIRouter()

class TemplateCreate(BaseModel):
    name: str
    description: str = ""
    blocks_json: str = "[]"
    is_default: bool = False

class TemplateOut(TemplateCreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[TemplateOut])
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template))
    return result.scalars().all()

@router.get("/{tmpl_id}", response_model=TemplateOut)
async def get_template(tmpl_id: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(Template, tmpl_id)
    if not t: raise HTTPException(404, "Not found")
    return t

@router.post("/", response_model=TemplateOut)
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    t = Template(**data.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t

@router.put("/{tmpl_id}", response_model=TemplateOut)
async def update_template(tmpl_id: int, data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    t = await db.get(Template, tmpl_id)
    if not t: raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return t

@router.delete("/{tmpl_id}")
async def delete_template(tmpl_id: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(Template, tmpl_id)
    if not t: raise HTTPException(404, "Not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}

@router.post("/{tmpl_id}/render")
async def render_preview(tmpl_id: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(Template, tmpl_id)
    if not t: raise HTTPException(404, "Not found")
    blocks = json.loads(t.blocks_json)
    from services.template_renderer import render_template, SAMPLE_DATA
    return {"html": render_template(blocks, SAMPLE_DATA)}
