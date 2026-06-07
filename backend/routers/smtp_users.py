import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import SMTPUser
from routers.auth import hash_password, verify_password

router = APIRouter()

_CA_CERT_PATH  = "/data/tls/ca.crt"   # was Thunderbird importieren muss
_SRV_CERT_PATH = os.getenv("TLS_CERT_FILE", "/data/tls/smtp.crt")

def _load_cert(path: str):
    from cryptography import x509
    from cryptography.hazmat.backends import default_backend
    try:
        with open(path, "rb") as f:
            return x509.load_pem_x509_certificate(f.read(), default_backend())
    except FileNotFoundError:
        return None

class CreateRequest(BaseModel):
    username: str
    password: str

class PasswordRequest(BaseModel):
    password: str

class VerifyRequest(BaseModel):
    username: str
    password: str

def _out(u: SMTPUser) -> dict:
    return {"id": u.id, "username": u.username, "is_active": u.is_active, "created_at": str(u.created_at)}

@router.get("/")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPUser).order_by(SMTPUser.id))
    return [_out(u) for u in result.scalars().all()]

@router.post("/")
async def create_user(req: CreateRequest, db: AsyncSession = Depends(get_db)):
    if not req.username.strip() or not req.password:
        raise HTTPException(400, "Benutzername und Passwort dürfen nicht leer sein")
    existing = await db.execute(select(SMTPUser).where(SMTPUser.username == req.username.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Benutzername bereits vergeben")
    user = SMTPUser(username=req.username.strip(), password=hash_password(req.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _out(user)

@router.put("/{user_id}/password")
async def change_password(user_id: int, req: PasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPUser).where(SMTPUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    user.password = hash_password(req.password)
    await db.commit()
    return {"ok": True}

@router.put("/{user_id}/toggle")
async def toggle_active(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPUser).where(SMTPUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    user.is_active = not user.is_active
    await db.commit()
    return _out(user)

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPUser).where(SMTPUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    await db.delete(user)
    await db.commit()
    return {"ok": True}

@router.post("/verify")
async def verify_user(req: VerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SMTPUser).where(SMTPUser.username == req.username, SMTPUser.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(401, "Ungültige Zugangsdaten")
    return {"ok": True, "username": user.username}

@router.get("/cert-info")
async def cert_info():
    from cryptography.x509.oid import NameOID
    ca_cert  = _load_cert(_CA_CERT_PATH)
    srv_cert = _load_cert(_SRV_CERT_PATH)
    if not ca_cert and not srv_cert:
        raise HTTPException(404, "Kein TLS-Zertifikat gefunden")
    ref = ca_cert or srv_cert
    try:
        cn = ref.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
    except Exception:
        cn = "—"
    not_after  = ref.not_valid_after.replace(tzinfo=timezone.utc)
    not_before = ref.not_valid_before.replace(tzinfo=timezone.utc)
    now        = datetime.now(timezone.utc)
    days_left  = (not_after - now).days
    return {
        "subject":    cn,
        "not_before": not_before.strftime("%d.%m.%Y"),
        "not_after":  not_after.strftime("%d.%m.%Y"),
        "days_left":  days_left,
        "expired":    days_left < 0,
        "has_ca":     ca_cert is not None,
    }

@router.get("/cert")
async def download_cert():
    # Liefert das CA-Cert wenn vorhanden (was Thunderbird importieren muss),
    # sonst das Server-Cert als Fallback.
    path = _CA_CERT_PATH if os.path.exists(_CA_CERT_PATH) else _SRV_CERT_PATH
    try:
        with open(path, "rb") as f:
            pem = f.read()
    except FileNotFoundError:
        raise HTTPException(404, "Kein TLS-Zertifikat gefunden")
    filename = "signaturmonster-ca.crt" if path == _CA_CERT_PATH else "signaturmonster-smtp.crt"
    return Response(
        content=pem,
        media_type="application/x-pem-file",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
