from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Setting
from pydantic import BaseModel
from typing import Optional
import aiosmtplib
import asyncio
from email.mime.text import MIMEText

router = APIRouter()

class SettingUpdate(BaseModel):
    value: str

class SMTPConfig(BaseModel):
    relay_host: str
    relay_port: int = 587
    relay_user: str
    relay_pass: str
    from_address: str

class SMTPTestRequest(BaseModel):
    to_address: str

async def _get_setting(db, key):
    s = await db.get(Setting, key)
    return s.value if s else ""

async def _set_setting(db, key, value):
    s = await db.get(Setting, key)
    if s:
        s.value = value
    else:
        s = Setting(key=key, value=value)
        db.add(s)

@router.get("/")
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting))
    return {s.key: s.value for s in result.scalars().all()}

@router.put("/{key}")
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    s = await db.get(Setting, key)
    if s:
        s.value = data.value
    else:
        s = Setting(key=key, value=data.value)
        db.add(s)
    await db.commit()
    return {"key": key, "value": data.value}

@router.get("/smtp")
async def get_smtp(db: AsyncSession = Depends(get_db)):
    return {
        "relay_host":    await _get_setting(db, "relay_host"),
        "relay_port":    int(await _get_setting(db, "relay_port") or 587),
        "relay_user":    await _get_setting(db, "relay_user"),
        "relay_pass":    await _get_setting(db, "relay_pass"),
        "from_address":  await _get_setting(db, "from_address"),
    }

@router.post("/smtp")
async def save_smtp(config: SMTPConfig, db: AsyncSession = Depends(get_db)):
    await _set_setting(db, "relay_host",   config.relay_host)
    await _set_setting(db, "relay_port",   str(config.relay_port))
    await _set_setting(db, "relay_user",   config.relay_user)
    await _set_setting(db, "relay_pass",   config.relay_pass)
    await _set_setting(db, "from_address", config.from_address)
    await db.commit()
    return {"ok": True}

@router.post("/smtp/test")
async def test_smtp(req: SMTPTestRequest, db: AsyncSession = Depends(get_db)):
    from models import SMTPAccount
    from sqlalchemy import select as sa_select
    # Neues System: Standard-Account verwenden
    result = await db.execute(sa_select(SMTPAccount).where(SMTPAccount.is_default == True))
    acc = result.scalar_one_or_none()
    if not acc:
        result = await db.execute(sa_select(SMTPAccount).limit(1))
        acc = result.scalar_one_or_none()
    if acc:
        host      = acc.relay_host
        port      = acc.relay_port
        user      = acc.relay_user
        pw        = acc.relay_pass
        from_addr = acc.from_address or acc.relay_user
    else:
        # Legacy-Fallback
        host      = await _get_setting(db, "relay_host")
        port      = int(await _get_setting(db, "relay_port") or 587)
        user      = await _get_setting(db, "relay_user")
        pw        = await _get_setting(db, "relay_pass")
        from_addr = await _get_setting(db, "from_address") or user

    if not host:
        return {"ok": False, "error": "Kein SMTP-Host konfiguriert"}

    msg = MIMEText(
        "Dies ist eine Testmail von Signaturmonster.\n\nDie SMTP-Verbindung funktioniert korrekt.",
        "plain", "utf-8"
    )
    msg["Subject"] = "Signaturmonster — SMTP Test"
    msg["From"]    = from_addr
    msg["To"]      = req.to_address

    try:
        await aiosmtplib.send(
            msg, hostname=host, port=port, username=user, password=pw,
            start_tls=True, timeout=10,
        )
        return {"ok": True, "message": f"Testmail erfolgreich an {req.to_address} gesendet"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
