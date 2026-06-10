import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import ImageAsset

try:
    from PIL import Image as PILImage
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

router = APIRouter()

_MAX_PX    = 1200
_THUMB_PX  = 300
_JPEG_Q    = 82
_ALLOWED   = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}


def _process(data: bytes, mime_type: str) -> tuple[bytes, bytes, int, int]:
    """Return (data, thumb_data, width, height). GIFs and SVGs pass through unchanged."""
    if not _PIL_AVAILABLE or mime_type in ("image/gif", "image/svg+xml"):
        thumb = data
        return data, thumb, 0, 0

    img = PILImage.open(io.BytesIO(data))
    w, h = img.size

    def _save(im: PILImage.Image, max_px: int) -> bytes:
        im = im.copy()
        im.thumbnail((max_px, max_px), PILImage.LANCZOS)
        buf = io.BytesIO()
        if mime_type == "image/png":
            if im.mode not in ("RGBA", "RGB", "L", "LA"):
                im = im.convert("RGBA")
            im.save(buf, format="PNG", optimize=True)
        else:
            if im.mode != "RGB":
                im = im.convert("RGB")
            im.save(buf, format="JPEG", quality=_JPEG_Q, optimize=True)
        return buf.getvalue()

    processed = _save(img, _MAX_PX)
    thumb     = _save(img, _THUMB_PX)
    resized   = PILImage.open(io.BytesIO(processed))
    return processed, thumb, resized.width, resized.height


# ── List (metadata only, no blob) ─────────────────────────────────────────────

@router.get("/")
async def list_images(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            ImageAsset.id, ImageAsset.name, ImageAsset.original_filename,
            ImageAsset.mime_type, ImageAsset.width, ImageAsset.height,
            ImageAsset.file_size, ImageAsset.created_at,
        ).order_by(ImageAsset.created_at.desc())
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    name: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    mime = file.content_type or "application/octet-stream"
    if mime not in _ALLOWED:
        raise HTTPException(400, f"Nicht unterstützter Dateityp: {mime}")

    raw = await file.read()
    asset_name = name.strip() or file.filename or "Unbenannt"

    processed, thumb, w, h = _process(raw, mime)

    img = ImageAsset(
        name              = asset_name,
        original_filename = file.filename or "",
        mime_type         = mime,
        data              = processed,
        thumb_data        = thumb,
        width             = w,
        height            = h,
        file_size         = len(processed),
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return {
        "id": img.id, "name": img.name, "mime_type": img.mime_type,
        "width": img.width, "height": img.height, "file_size": img.file_size,
    }


# ── Rename ────────────────────────────────────────────────────────────────────

@router.patch("/{image_id}")
async def rename_image(image_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    img = await db.get(ImageAsset, image_id)
    if not img:
        raise HTTPException(404)
    if "name" in body:
        img.name = body["name"]
    await db.commit()
    return {"ok": True}


# ── Serve full image ──────────────────────────────────────────────────────────

@router.get("/{image_id}/serve")
async def serve_image(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await db.get(ImageAsset, image_id)
    if not img:
        raise HTTPException(404)
    return Response(
        content     = img.data,
        media_type  = img.mime_type,
        headers     = {"Cache-Control": "public, max-age=86400"},
    )


# ── Serve thumbnail ───────────────────────────────────────────────────────────

@router.get("/{image_id}/thumb")
async def serve_thumb(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await db.get(ImageAsset, image_id)
    if not img:
        raise HTTPException(404)
    data = img.thumb_data or img.data
    mt   = "image/jpeg" if img.mime_type not in ("image/png", "image/gif", "image/svg+xml") else img.mime_type
    return Response(
        content     = data,
        media_type  = mt,
        headers     = {"Cache-Control": "public, max-age=86400"},
    )


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{image_id}")
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await db.get(ImageAsset, image_id)
    if not img:
        raise HTTPException(404)
    await db.delete(img)
    await db.commit()
    return {"ok": True}
