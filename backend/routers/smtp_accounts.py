from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import aiosmtplib
from email.mime.text import MIMEText
from database import get_db
from models import SMTPAccount, Setting

router = APIRouter()

class SMTPAccountIn(BaseModel):
    name: str
    relay_host: str = ""
    relay_port: int = 587
    relay_user: str = ""
    relay_pass: str = ""
    from_address: str = ""
    match_domain: str = ""
    is_default: bool = False

class SMTPAccountOut(SMTPAccountIn):
    id: int
    class Config:
        from_attributes = True

class SMTPTestRequest(BaseModel):
    to_address: str

@router.get("/", response_model=list[SMTPAccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPAccount).order_by(SMTPAccount.id))
    return result.scalars().all()

@router.post("/", response_model=SMTPAccountOut)
async def create_account(data: SMTPAccountIn, db: AsyncSession = Depends(get_db)):
    if data.is_default:
        await _clear_default(db)
    acc = SMTPAccount(**data.model_dump())
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return acc

@router.put("/{account_id}", response_model=SMTPAccountOut)
async def update_account(account_id: int, data: SMTPAccountIn, db: AsyncSession = Depends(get_db)):
    acc = await db.get(SMTPAccount, account_id)
    if not acc:
        raise HTTPException(404, "Not found")
    if data.is_default:
        await _clear_default(db, exclude_id=account_id)
    for k, v in data.model_dump().items():
        setattr(acc, k, v)
    await db.commit()
    await db.refresh(acc)
    return acc

@router.delete("/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    acc = await db.get(SMTPAccount, account_id)
    if not acc:
        raise HTTPException(404, "Not found")
    await db.delete(acc)
    await db.commit()
    return {"ok": True}

@router.get("/by-domain/{domain}", response_model=Optional[SMTPAccountOut])
async def get_by_domain(domain: str, db: AsyncSession = Depends(get_db)):
    domain = domain.lower()
    # 1. Exakter Domain-Match
    result = await db.execute(
        select(SMTPAccount).where(SMTPAccount.match_domain == domain)
    )
    acc = result.scalar_one_or_none()
    if acc:
        return acc
    # 2. Default-Account
    result = await db.execute(
        select(SMTPAccount).where(SMTPAccount.is_default == True)
    )
    acc = result.scalar_one_or_none()
    if acc:
        return acc
    # 3. Erster verfügbarer Account
    result = await db.execute(select(SMTPAccount).limit(1))
    return result.scalar_one_or_none()

@router.get("/{account_id}", response_model=SMTPAccountOut)
async def get_account(account_id: int, db: AsyncSession = Depends(get_db)):
    acc = await db.get(SMTPAccount, account_id)
    if not acc:
        raise HTTPException(404, "Not found")
    return acc

@router.post("/{account_id}/test")
async def test_account(account_id: int, req: SMTPTestRequest, db: AsyncSession = Depends(get_db)):
    acc = await db.get(SMTPAccount, account_id)
    if not acc:
        raise HTTPException(404, "Not found")
    return await _do_smtp_test(acc.relay_host, acc.relay_port, acc.relay_user, acc.relay_pass,
                               acc.from_address or acc.relay_user, req.to_address)

async def _clear_default(db: AsyncSession, exclude_id: int = None):
    result = await db.execute(select(SMTPAccount).where(SMTPAccount.is_default == True))
    for acc in result.scalars().all():
        if exclude_id and acc.id == exclude_id:
            continue
        acc.is_default = False

async def _do_smtp_test(host, port, user, pw, from_addr, to_addr):
    if not host:
        return {"ok": False, "error": "Kein SMTP-Host konfiguriert"}
    msg = MIMEText("Dies ist eine Testmail von Signaturmonster.\n\nDie SMTP-Verbindung funktioniert korrekt.", "plain", "utf-8")
    msg["Subject"] = "Signaturmonster — SMTP Test"
    msg["From"]    = from_addr
    msg["To"]      = to_addr
    try:
        await aiosmtplib.send(msg, hostname=host, port=int(port), username=user, password=pw, start_tls=True, timeout=10)
        return {"ok": True, "message": f"Testmail erfolgreich an {to_addr} gesendet"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def migrate_legacy_smtp(db: AsyncSession):
    """Einmalige Migration: alte Settings-SMTP → ersten SMTPAccount anlegen."""
    result = await db.execute(select(SMTPAccount))
    if result.scalars().first():
        return  # Schon Accounts vorhanden
    host = await db.get(Setting, "relay_host")
    if not host or not host.value:
        return  # Keine alten Einstellungen
    relay_port_s = await db.get(Setting, "relay_port")
    relay_user   = await db.get(Setting, "relay_user")
    relay_pass   = await db.get(Setting, "relay_pass")
    from_address = await db.get(Setting, "from_address")
    acc = SMTPAccount(
        name         = "Standard (migriert)",
        relay_host   = host.value,
        relay_port   = int(relay_port_s.value) if relay_port_s and relay_port_s.value else 587,
        relay_user   = relay_user.value   if relay_user   else "",
        relay_pass   = relay_pass.value   if relay_pass   else "",
        from_address = from_address.value if from_address else "",
        match_domain = "",
        is_default   = True,
    )
    db.add(acc)
    await db.commit()
