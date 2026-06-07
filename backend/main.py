from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
load_dotenv()
from database import init_db
from routers import signatures, users, settings, enrichment, templates
from routers import rules as rules_router
from routers import ci as ci_router
from routers import senders as senders_router
from routers import smtp_accounts as smtp_accounts_router
from routers import disclaimers as disclaimers_router
from routers import banners as banners_router
from routers import auth as auth_router
from routers import license as license_router
from routers import smtp_users as smtp_users_router
from routers import update as update_router
from routers import logs as logs_router

app = FastAPI(title="Signaturmonster API", version="0.7.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

import os as _os
AUTH_EXCLUDED   = {"/api/auth/login", "/health", "/api/smtp-users/verify"}
_PROXY_SECRET   = _os.getenv("PROXY_SECRET", "signaturmonster-internal-secret")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path not in AUTH_EXCLUDED:
        # Interner Proxy-Aufruf (kein JWT nötig, aber Secret muss stimmen)
        if request.headers.get("X-Proxy-Token") == _PROXY_SECRET:
            return await call_next(request)
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token:
            return JSONResponse({"detail": "Nicht angemeldet"}, status_code=401)
        from routers.auth import decode_token
        if decode_token(token) is None:
            return JSONResponse({"detail": "Token ungültig oder abgelaufen"}, status_code=401)
    return await call_next(request)

@app.on_event("startup")
async def startup():
    await init_db()
    from database import AsyncSessionLocal
    from routers.smtp_accounts import migrate_legacy_smtp
    from routers.auth import hash_password
    from sqlalchemy import select
    from models import User
    from log_service import write_log
    async with AsyncSessionLocal() as db:
        await migrate_legacy_smtp(db)
        result = await db.execute(select(User))
        if not result.scalars().first():
            db.add(User(
                name     = "monster",
                email    = "monster@local",
                password = hash_password("monster"),
                is_admin = True,
            ))
            await db.commit()
    import asyncio
    await asyncio.to_thread(write_log, "INFO", "backend", "Signaturmonster Backend gestartet")

app.include_router(auth_router.router,          prefix="/api/auth",          tags=["auth"])
app.include_router(license_router.router,       prefix="/api/license",       tags=["license"])
app.include_router(signatures.router,           prefix="/api/signatures",    tags=["signatures"])
app.include_router(rules_router.router,         prefix="/api/rules",         tags=["rules"])
app.include_router(users.router,                prefix="/api/users",         tags=["users"])
app.include_router(settings.router,             prefix="/api/settings",      tags=["settings"])
app.include_router(enrichment.router,           prefix="/api/enrichment",    tags=["enrichment"])
app.include_router(templates.router,            prefix="/api/templates",     tags=["templates"])
app.include_router(ci_router.router,            prefix="/api/ci",            tags=["ci"])
app.include_router(senders_router.router,       prefix="/api/senders",       tags=["senders"])
app.include_router(smtp_accounts_router.router, prefix="/api/smtp-accounts", tags=["smtp-accounts"])
app.include_router(disclaimers_router.router,   prefix="/api/disclaimers",   tags=["disclaimers"])
app.include_router(banners_router.router,       prefix="/api/banners",       tags=["banners"])
app.include_router(smtp_users_router.router,    prefix="/api/smtp-users",    tags=["smtp-users"])
app.include_router(update_router.router,        prefix="/api/update",        tags=["update"])
app.include_router(logs_router.router,          prefix="/api/logs",          tags=["logs"])

@app.get("/health")
async def health():
    return {"status": "ok"}
