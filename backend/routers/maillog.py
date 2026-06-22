import base64
import io
import csv
import json
import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from database import get_db
from models import MailLog, MailQueueEntry, Setting
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

logger = logging.getLogger(__name__)
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
    message_b64: Optional[str] = None

@router.post("/")
async def create_log(data: MailLogCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()

    # message_b64 nur speichern wenn Mail-Archiv aktiviert
    archive_setting = await db.get(Setting, "mail_archive_enabled")
    if not (archive_setting and archive_setting.value == "true"):
        payload["message_b64"] = None

    entry = MailLog(**payload)
    db.add(entry)

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
        "total_all":     total_q.scalar(),
        "total_today":   today_q.scalar(),
        "signed_today":  signed_q.scalar(),
        "no_rule_today": norule_q.scalar(),
        "error_today":   error_q.scalar(),
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

@router.get("/{log_id}/eml")
async def download_eml(log_id: int, db: AsyncSession = Depends(get_db)):
    entry = await db.get(MailLog, log_id)
    if not entry:
        raise HTTPException(404, "Log-Eintrag nicht gefunden")
    if not entry.message_b64:
        raise HTTPException(404, "Kein Mail-Archiv für diesen Eintrag (Archiv-Funktion aktivieren)")
    raw = base64.b64decode(entry.message_b64)
    safe_subject = "".join(c for c in (entry.subject or "mail")[:40] if c.isalnum() or c in " -_")
    filename = f"{safe_subject.strip() or 'mail'}.eml"
    return Response(
        content=raw,
        media_type="message/rfc822",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/{log_id}/resend")
async def resend_mail(log_id: int, db: AsyncSession = Depends(get_db)):
    entry = await db.get(MailLog, log_id)
    if not entry:
        raise HTTPException(404, "Log-Eintrag nicht gefunden")
    if not entry.message_b64:
        raise HTTPException(404, "Kein Mail-Archiv für diesen Eintrag (Archiv-Funktion aktivieren)")

    rcpt_list = [e.strip() for e in (entry.recipients or "").split(",") if e.strip()]
    queue_entry = MailQueueEntry(
        sender            = entry.sender,
        recipients        = entry.recipients,
        subject           = entry.subject,
        message_b64       = entry.message_b64,
        smtp_account_json = "",
        rcpt_tos_json     = json.dumps(rcpt_list),
        status            = "pending",
        max_attempts      = 5,
    )
    db.add(queue_entry)
    await db.commit()
    logger.info(f"Mail re-queued from log entry {log_id} (sender={entry.sender})")
    return {"ok": True, "queue_id": queue_entry.id}

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
        "has_eml":        bool(r.message_b64),
    }
