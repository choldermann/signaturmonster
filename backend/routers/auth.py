from datetime import datetime, timedelta
from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from jose import jwt, JWTError
from passlib.context import CryptContext
from database import get_db
from models import User

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "signaturmonster-dev-secret-please-change")
ALGORITHM  = "HS256"
TOKEN_DAYS = 30

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None

async def get_current_user_id(
    authorization: str = Header(default=""),
) -> int:
    token = authorization.removeprefix("Bearer ").strip()
    uid = decode_token(token)
    if uid is None:
        raise HTTPException(401, "Nicht angemeldet")
    return uid

def _user_out(user: User, token: str) -> dict:
    return {
        "token": token,
        "user": {"id": user.id, "name": user.name, "is_admin": user.is_admin},
    }

@router.get("/me")
async def get_me(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    return {"id": user.id, "name": user.name, "is_admin": user.is_admin}

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    import asyncio
    from log_service import write_log
    result = await db.execute(select(User).where(User.name == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password):
        await asyncio.to_thread(write_log, "WARNING", "backend", f"Login fehlgeschlagen: Benutzer '{req.username}'")
        raise HTTPException(401, "Ungültiger Benutzername oder Passwort")
    await asyncio.to_thread(write_log, "INFO", "backend", f"Login erfolgreich: Benutzer '{user.name}'")
    return _user_out(user, create_token(user.id))

@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.username.strip() or not req.password:
        raise HTTPException(400, "Benutzername und Passwort dürfen nicht leer sein")
    result = await db.execute(select(User).where(User.name == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Benutzername bereits vergeben")
    user = User(
        name     = req.username.strip(),
        email    = f"{req.username.strip()}@local",
        password = hash_password(req.password),
        is_admin = False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_out(user, create_token(user.id))
