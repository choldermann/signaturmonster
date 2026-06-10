import aiosmtplib
import aiohttp
import logging
import os
from email.message import Message

logger = logging.getLogger(__name__)

BACKEND_URL   = os.getenv("BACKEND_URL", "http://backend:8000")
_PROXY_SECRET = os.getenv("PROXY_SECRET", "signaturmonster-internal-secret")
_INTERNAL_HDR = {"X-Proxy-Token": _PROXY_SECRET}


async def _fetch_account(url: str) -> dict | None:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=_INTERNAL_HDR, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data if data else None
    except Exception as e:
        logger.warning(f"SMTP account fetch failed ({url}): {e}")
    return None


def _env_fallback() -> dict:
    return {
        "relay_host":   os.getenv("RELAY_HOST", ""),
        "relay_port":   int(os.getenv("RELAY_PORT", 587)),
        "relay_user":   os.getenv("RELAY_USER", ""),
        "relay_pass":   os.getenv("RELAY_PASS", ""),
        "from_address": os.getenv("FROM_ADDRESS", ""),
    }


async def get_relay_config(sender_email: str = "", smtp_account: dict | None = None) -> dict:
    """
    Priorität:
    1. Explizites smtp_account-Dict aus der Regel
    2. Domain-Match via API
    3. Env-Variablen als letzter Fallback
    """
    if smtp_account and smtp_account.get("relay_host"):
        return smtp_account

    domain = sender_email.split("@")[-1] if "@" in sender_email else ""
    if domain:
        cfg = await _fetch_account(f"{BACKEND_URL}/api/smtp-accounts/by-domain/{domain}")
        if cfg and cfg.get("relay_host"):
            logger.info(f"Using SMTP account '{cfg.get('name', cfg['relay_host'])}' for domain '{domain}'")
            return cfg

    return _env_fallback()


class SMTPRelay:
    async def send(self, message: Message, sender_email: str = "", smtp_account: dict | None = None, rcpt_tos: list | None = None):
        cfg = await get_relay_config(sender_email, smtp_account)
        host = cfg.get("relay_host", "")

        if not host:
            logger.warning("No RELAY_HOST configured — mail not sent")
            return

        logger.info(f"Relaying via {host}:{cfg.get('relay_port', 587)} (sender: {sender_email or '?'})")

        send_kwargs: dict = dict(
            hostname=host,
            port=int(cfg.get("relay_port", 587)),
            username=cfg.get("relay_user", ""),
            password=cfg.get("relay_pass", ""),
            start_tls=True,
        )
        if rcpt_tos:
            send_kwargs["recipients"] = rcpt_tos
        await aiosmtplib.send(message, **send_kwargs)
        logger.info(f"Relayed successfully via {host}")
