from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import User
from routers.auth import decode_token, hash_password

router = APIRouter()

# ─── Admin-Dependency ─────────────────────────────────────────────────────────
async def require_admin(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "Nicht angemeldet")
    user = await db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(403, "Nur Administratoren haben Zugriff")
    return user

# ─── Schemas ──────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_admin: Optional[bool] = None

class PasswordChange(BaseModel):
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    class Config:
        from_attributes = True

# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/", response_model=list[UserOut])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.name))
    return result.scalars().all()

@router.post("/", response_model=UserOut)
async def create_user(data: UserCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if not data.username.strip() or not data.password:
        raise HTTPException(400, "Benutzername und Passwort dürfen nicht leer sein")
    result = await db.execute(select(User).where(User.name == data.username.strip()))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Benutzername bereits vergeben")
    user = User(
        name     = data.username.strip(),
        email    = f"{data.username.strip()}@local",
        password = hash_password(data.password),
        is_admin = data.is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: int, data: UserUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    if data.username is not None:
        data.username = data.username.strip()
        if not data.username:
            raise HTTPException(400, "Benutzername darf nicht leer sein")
        result = await db.execute(select(User).where(User.name == data.username, User.id != user_id))
        if result.scalar_one_or_none():
            raise HTTPException(400, "Benutzername bereits vergeben")
        user.name  = data.username
        user.email = f"{data.username}@local"
    if data.is_admin is not None:
        # Letzten Admin nicht degradieren
        if not data.is_admin and user.id == admin.id:
            raise HTTPException(400, "Du kannst dich nicht selbst degradieren")
        user.is_admin = data.is_admin
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/{user_id}/password")
async def change_password(user_id: int, data: PasswordChange, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    if not data.password:
        raise HTTPException(400, "Passwort darf nicht leer sein")
    user.password = hash_password(data.password)
    await db.commit()
    return {"ok": True}

@router.delete("/{user_id}")
async def delete_user(user_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "Du kannst deinen eigenen Account nicht löschen")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    await db.delete(user)
    await db.commit()
    return {"ok": True}

@router.get("/me")
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "Nicht angemeldet")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    return {"id": user.id, "name": user.name, "is_admin": user.is_admin}
