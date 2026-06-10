from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from database import get_db
from models import MailQueueEntry
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()

# Exponential backoff per attempt index (seconds)
_BACKOFF = [0, 60, 300, 1800, 7200]

def _next_attempt(attempts: int) -> datetime:
    delay = _BACKOFF[min(attempts, len(_BACKOFF) - 1)]
    return datetime.utcnow() + timedelta(seconds=delay)

def _row(e: MailQueueEntry) -> dict:
    return {
        "id":               e.id,
        "created_at":       e.created_at.isoformat() if e.created_at else "",
        "last_attempt_at":  e.last_attempt_at.isoformat() if e.last_attempt_at else None,
        "next_attempt_at":  e.next_attempt_at.isoformat() if e.next_attempt_at else None,
        "attempts":         e.attempts,
        "max_attempts":     e.max_attempts,
        "status":           e.status,
        "sender":           e.sender,
        "recipients":       e.recipients,
        "subject":          e.subject,
        "last_error":       e.last_error,
        # message_b64 intentionally excluded from list view
    }

class EnqueueBody(BaseModel):
    sender: str = ""
    recipients: str = ""
    subject: str = ""
    message_b64: str
    smtp_account_json: str = ""
    rcpt_tos_json: str = ""

class FailBody(BaseModel):
    error: str = ""

@router.post("/")
async def enqueue(body: EnqueueBody, db: AsyncSession = Depends(get_db)):
    entry = MailQueueEntry(
        sender            = body.sender,
        recipients        = body.recipients,
        subject           = body.subject,
        message_b64       = body.message_b64,
        smtp_account_json = body.smtp_account_json,
        rcpt_tos_json     = body.rcpt_tos_json,
        next_attempt_at   = datetime.utcnow(),
        status            = "pending",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id}

@router.get("/pending")
async def get_pending(db: AsyncSession = Depends(get_db)):
    """Returns entries ready to relay (next_attempt_at <= now, status=pending)."""
    now = datetime.utcnow()
    result = await db.execute(
        select(MailQueueEntry)
        .where(and_(
            MailQueueEntry.status == "pending",
            MailQueueEntry.next_attempt_at <= now,
        ))
        .order_by(MailQueueEntry.created_at)
        .limit(20)
    )
    entries = result.scalars().all()
    return [
        {**_row(e), "message_b64": e.message_b64, "smtp_account_json": e.smtp_account_json, "rcpt_tos_json": e.rcpt_tos_json or ""}
        for e in entries
    ]

@router.put("/{entry_id}/sent")
async def mark_sent(entry_id: int, db: AsyncSession = Depends(get_db)):
    e = await db.get(MailQueueEntry, entry_id)
    if not e:
        return {"ok": False}
    e.status          = "sent"
    e.last_attempt_at = datetime.utcnow()
    e.last_error      = ""
    await db.commit()
    return {"ok": True}

@router.put("/{entry_id}/failed")
async def mark_failed(entry_id: int, body: FailBody, db: AsyncSession = Depends(get_db)):
    e = await db.get(MailQueueEntry, entry_id)
    if not e:
        return {"ok": False}
    e.attempts       += 1
    e.last_attempt_at = datetime.utcnow()
    e.last_error      = body.error[:500]
    if e.attempts >= e.max_attempts:
        e.status          = "failed"
        e.next_attempt_at = None
    else:
        e.status          = "pending"
        e.next_attempt_at = _next_attempt(e.attempts)
    await db.commit()
    return {"ok": True, "attempts": e.attempts, "status": e.status}

@router.put("/{entry_id}/retry")
async def manual_retry(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Reset a failed entry back to pending for immediate retry."""
    e = await db.get(MailQueueEntry, entry_id)
    if not e:
        return {"ok": False}
    e.status          = "pending"
    e.attempts        = 0
    e.next_attempt_at = datetime.utcnow()
    e.last_error      = ""
    await db.commit()
    return {"ok": True}

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    e = await db.get(MailQueueEntry, entry_id)
    if not e:
        return {"ok": False}
    await db.delete(e)
    await db.commit()
    return {"ok": True}

@router.delete("/")
async def clear_sent(db: AsyncSession = Depends(get_db)):
    """Remove all sent entries (housekeeping)."""
    await db.execute(delete(MailQueueEntry).where(MailQueueEntry.status == "sent"))
    await db.commit()
    return {"ok": True}

@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    total_q   = await db.execute(select(func.count()).select_from(MailQueueEntry))
    pending_q = await db.execute(select(func.count()).select_from(MailQueueEntry).where(MailQueueEntry.status == "pending"))
    sent_q    = await db.execute(select(func.count()).select_from(MailQueueEntry).where(MailQueueEntry.status == "sent"))
    failed_q  = await db.execute(select(func.count()).select_from(MailQueueEntry).where(MailQueueEntry.status == "failed"))
    return {
        "total":   total_q.scalar(),
        "pending": pending_q.scalar(),
        "sent":    sent_q.scalar(),
        "failed":  failed_q.scalar(),
    }

@router.get("/")
async def list_queue(
    db: AsyncSession = Depends(get_db),
    status: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    filters = []
    if status:
        filters.append(MailQueueEntry.status == status)
    where = filters[0] if len(filters) == 1 else and_(*filters) if filters else True
    total_r = await db.execute(select(func.count()).select_from(MailQueueEntry).where(where))
    total   = total_r.scalar()
    result  = await db.execute(
        select(MailQueueEntry).where(where)
        .order_by(MailQueueEntry.created_at.desc())
        .offset((page - 1) * limit).limit(limit)
    )
    return {
        "items": [_row(e) for e in result.scalars().all()],
        "total": total,
        "page":  page,
        "pages": max(1, (total + limit - 1) // limit),
    }
