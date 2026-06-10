from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from database import get_db
from models import MailLog, Setting
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import io, csv

router = APIRouter()

class MailLogCreate(BaseModel):
    sender: str = ""
    recipients: str = ""
    subject: str = ""
    rule_id: Optional[int] = None
    rule_name: str = ""
    signature_name: str = ""
    action: str = "signed"
    relay_ok: bool = True
    relay_error: str = ""
    duration_ms: int = 0
    message_size: int = 0

@router.post("/")
async def create_log(data: MailLogCreate, db: AsyncSession = Depends(get_db)):
    entry = MailLog(**data.model_dump())
    db.add(entry)
    # Auto-cleanup: delete entries older than retention period
    ret = await db.get(Setting, "log_retention_days")
    days = int(ret.value) if ret and ret.value and ret.value.isdigit() else 90
    if days > 0:
        from sqlalchemy import text
        await db.execute(
            text("DELETE FROM mail_logs WHERE timestamp < datetime('now', :offset)"),
            {"offset": f"-{days} days"},
        )
    await db.commit()
    return {"ok": True}

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    today = date.today().isoformat()
    total_q  = await db.execute(select(func.count()).select_from(MailLog))
    today_q  = await db.execute(select(func.count()).select_from(MailLog).where(
        func.strftime("%Y-%m-%d", MailLog.timestamp) == today))
    signed_q = await db.execute(select(func.count()).select_from(MailLog).where(
        and_(func.strftime("%Y-%m-%d", MailLog.timestamp) == today, MailLog.action == "signed")))
    norule_q = await db.execute(select(func.count()).select_from(MailLog).where(
        and_(func.strftime("%Y-%m-%d", MailLog.timestamp) == today, MailLog.action == "no_rule")))
    error_q  = await db.execute(select(func.count()).select_from(MailLog).where(
        and_(func.strftime("%Y-%m-%d", MailLog.timestamp) == today, MailLog.action == "error")))
    return {
        "total_all":    total_q.scalar(),
        "total_today":  today_q.scalar(),
        "signed_today": signed_q.scalar(),
        "no_rule_today": norule_q.scalar(),
        "error_today":  error_q.scalar(),
    }

@router.get("/")
async def list_logs(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sender: str = "",
    action: str = "",
    date_from: str = "",
    date_to: str = "",
):
    filters = []
    if sender:
        filters.append(MailLog.sender.contains(sender.lower()))
    if action:
        filters.append(MailLog.action == action)
    if date_from:
        filters.append(func.strftime("%Y-%m-%d", MailLog.timestamp) >= date_from)
    if date_to:
        filters.append(func.strftime("%Y-%m-%d", MailLog.timestamp) <= date_to)

    where = and_(*filters) if filters else True

    total_r = await db.execute(select(func.count()).select_from(MailLog).where(where))
    total   = total_r.scalar()

    result  = await db.execute(
        select(MailLog).where(where)
        .order_by(MailLog.timestamp.desc())
        .offset((page - 1) * limit).limit(limit)
    )
    items = result.scalars().all()

    return {
        "items": [_row(r) for r in items],
        "total": total,
        "page":  page,
        "pages": max(1, (total + limit - 1) // limit),
    }

@router.get("/export.csv")
async def export_csv(
    db: AsyncSession = Depends(get_db),
    sender: str = "",
    action: str = "",
    date_from: str = "",
    date_to: str = "",
):
    filters = []
    if sender:
        filters.append(MailLog.sender.contains(sender.lower()))
    if action:
        filters.append(MailLog.action == action)
    if date_from:
        filters.append(func.strftime("%Y-%m-%d", MailLog.timestamp) >= date_from)
    if date_to:
        filters.append(func.strftime("%Y-%m-%d", MailLog.timestamp) <= date_to)
    where = and_(*filters) if filters else True

    result = await db.execute(select(MailLog).where(where).order_by(MailLog.timestamp.desc()))
    rows = result.scalars().all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Zeitstempel","Absender","Empfänger","Betreff","Regel","Signatur","Aktion","Relay","Fehler","Dauer(ms)","Größe(bytes)"])
    for r in rows:
        w.writerow([r.timestamp, r.sender, r.recipients, r.subject, r.rule_name, r.signature_name,
                    r.action, "ok" if r.relay_ok else "error", r.relay_error, r.duration_ms, r.message_size])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mail-audit.csv"},
    )

@router.delete("/")
async def clear_logs(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(MailLog))
    await db.commit()
    return {"ok": True}

def _row(r: MailLog) -> dict:
    return {
        "id":             r.id,
        "timestamp":      r.timestamp.isoformat() if r.timestamp else "",
        "sender":         r.sender,
        "recipients":     r.recipients,
        "subject":        r.subject,
        "rule_id":        r.rule_id,
        "rule_name":      r.rule_name,
        "signature_name": r.signature_name,
        "action":         r.action,
        "relay_ok":       r.relay_ok,
        "relay_error":    r.relay_error,
        "duration_ms":    r.duration_ms,
        "message_size":   r.message_size,
    }
