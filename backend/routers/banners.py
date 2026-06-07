import asyncio, base64, json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
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


@router.post("/preview-gif")
async def preview_gif(body: dict):
    """Generate a GIF from props dict, return base64."""
    from banner_gif import generate_gif
    try:
        gif_bytes = await asyncio.to_thread(generate_gif, body)
        return {"gif_b64": base64.b64encode(gif_bytes).decode()}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{banner_id}/gif")
async def get_banner_gif(banner_id: int, db: AsyncSession = Depends(get_db)):
    """Serve a stored GIF directly (for preview img tag)."""
    b = await db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Not found")
    props = json.loads(b.props_json)
    gif_b64 = props.get("gif_data")
    if not gif_b64:
        raise HTTPException(404, "Kein GIF generiert")
    return Response(base64.b64decode(gif_b64), media_type="image/gif")
