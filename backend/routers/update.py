import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

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
    return await _post("/update")

@router.post("/stream")
async def stream_update():
    async def _proxy():
        try:
            async with httpx.AsyncClient() as c:
                async with c.stream("POST", f"{_UPDATER}/update/stream", timeout=300) as r:
                    if r.status_code != 200:
                        body = await r.aread()
                        yield f"data: {json.dumps({'step': 'error', 'msg': f'Updater {r.status_code}: {body.decode()[:200]}'})}\n\n".encode()
                        return
                    async for chunk in r.aiter_bytes():
                        yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'msg': str(e)})}\n\n".encode()
    return StreamingResponse(
        _proxy(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
