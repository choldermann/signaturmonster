from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:////data/signaturmonster.db")
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def init_db():
    from models import Signature, Rule, User, Setting, SenderProfile, SMTPAccount, Disclaimer, Banner, SMTPUser, LogEntry, ImageAsset, Campaign, MailLog, MailQueueEntry
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for migration in [
            "ALTER TABLE signatures ADD COLUMN designer_json TEXT",
            "ALTER TABLE sender_profiles ADD COLUMN street TEXT DEFAULT ''",
            "ALTER TABLE sender_profiles ADD COLUMN postal_code TEXT DEFAULT ''",
            "ALTER TABLE sender_profiles ADD COLUMN city TEXT DEFAULT ''",
            "ALTER TABLE sender_profiles ADD COLUMN country TEXT DEFAULT ''",
            "ALTER TABLE rules ADD COLUMN smtp_account_id INTEGER REFERENCES smtp_accounts(id)",
            "ALTER TABLE rules ADD COLUMN disclaimer_id INTEGER REFERENCES disclaimers(id)",
            "ALTER TABLE rules ADD COLUMN recipient_scope TEXT DEFAULT 'all'",
            "ALTER TABLE rules ADD COLUMN match_recipient TEXT",
            "ALTER TABLE rules ADD COLUMN match_recipient_domain TEXT",
            "ALTER TABLE rules ADD COLUMN time_from TEXT",
            "ALTER TABLE rules ADD COLUMN time_until TEXT",
            "ALTER TABLE rules ADD COLUMN days_of_week TEXT",
            "ALTER TABLE sender_profiles ADD COLUMN claimed_by_user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE mail_queue ADD COLUMN rcpt_tos_json TEXT DEFAULT ''",
        ]:
            try:
                await conn.execute(text(migration))
            except Exception:
                pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
