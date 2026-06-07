import os, sqlite3, json
from datetime import datetime

_DB_PATH = os.getenv("DATABASE_URL", "sqlite+aiosqlite:////data/signaturmonster.db").replace("sqlite+aiosqlite:///", "")


def write_log(level: str, service: str, message: str, details: dict = None):
    try:
        conn = sqlite3.connect(_DB_PATH)
        conn.execute(
            "INSERT INTO logs (timestamp, level, service, message, details) VALUES (?,?,?,?,?)",
            (datetime.utcnow().isoformat(), level.upper(), service, message, json.dumps(details) if details else None),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
