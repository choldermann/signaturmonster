import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()
_UPDATER = os.getenv("UPDATER_URL", "http://updater:9000")


async def _get(path: str, timeout: int = 15):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{_UPDATER}{path}", timeout=timeout)
            return r.json()
    except Exception as e:
        raise HTTPException(503, f"Updater nicht erreichbar: {e}")


async def _post(path: str, timeout: int = 30):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{_UPDATER}{path}", timeout=timeout)
            return r.json()
    except Exception as e:
        raise HTTPException(503, f"Updater nicht erreichbar: {e}")


@router.get("/version")
async def version():
    return await _get("/version")

@router.get("/changelog")
async def changelog():
    return await _get("/changelog")

@router.post("/run")
async def run_update():
    return await _post("/update/start")

@router.get("/status")
async def update_status():
    return await _get("/update/status")

