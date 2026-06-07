import os, sqlite3, asyncio
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

_DB_PATH = os.getenv("DATABASE_URL", "sqlite+aiosqlite:////data/signaturmonster.db").replace("sqlite+aiosqlite:///", "")


def _query(level=None, service=None, search=None, limit=100, offset=0):
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    where, params = [], []
    if level and level.upper() != "ALL":
        where.append("level = ?"); params.append(level.upper())
    if service and service != "all":
        where.append("service = ?"); params.append(service)
    if search:
        where.append("message LIKE ?"); params.append(f"%{search}%")
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = conn.execute(f"SELECT COUNT(*) FROM logs {clause}", params).fetchone()[0]
    rows  = conn.execute(
        f"SELECT id, timestamp, level, service, message, details FROM logs {clause} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()
    conn.close()
    return {"total": total, "items": [dict(r) for r in rows]}


class IngestBody(BaseModel):
    level: str
    service: str
    message: str
    details: Optional[dict] = None


@router.get("")
async def get_logs(
    level:   Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    search:  Optional[str] = Query(None),
    limit:   int           = Query(100, le=500),
    offset:  int           = Query(0, ge=0),
):
    return await asyncio.to_thread(_query, level, service, search, limit, offset)


@router.post("/ingest")
async def ingest(body: IngestBody):
    from log_service import write_log
    await asyncio.to_thread(write_log, body.level, body.service, body.message, body.details)
    return {"ok": True}


@router.delete("")
async def clear_logs():
    def _clear():
        conn = sqlite3.connect(_DB_PATH)
        conn.execute("DELETE FROM logs")
        conn.commit()
        conn.close()
    await asyncio.to_thread(_clear)
    return {"ok": True}
