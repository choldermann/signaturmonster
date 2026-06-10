import aiohttp
import logging
import os
from email.message import Message

logger = logging.getLogger(__name__)

_PROXY_SECRET = os.getenv("PROXY_SECRET", "signaturmonster-internal-secret")
_INTERNAL_HDR = {"X-Proxy-Token": _PROXY_SECRET}

class RuleEngine:
    def __init__(self, backend_url: str):
        self.backend_url = backend_url

    def _extract_address(self, header: str) -> str:
        if "<" in header and ">" in header:
            return header.split("<")[1].split(">")[0].strip().lower()
        return header.strip().lower()

    def _extract_addresses(self, header: str) -> list[str]:
        """Split a comma-separated address header into individual address strings."""
        if not header:
            return []
        return [a.strip() for a in header.split(",") if a.strip()]

    def _is_reply(self, message: Message) -> bool:
        return "In-Reply-To" in message or "References" in message

    async def get_rule(self, sender_header: str, message: Message) -> dict | None:
        sender = self._extract_address(sender_header)
        domain = sender.split("@")[-1] if "@" in sender else ""
        to_raw  = message.get("To",  "") or ""
        cc_raw  = message.get("Cc",  "") or ""
        recipients = self._extract_addresses(to_raw) + self._extract_addresses(cc_raw)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.backend_url}/api/rules/match",
                    headers=_INTERNAL_HDR,
                    json={"sender": sender, "domain": domain, "is_reply": self._is_reply(message), "recipients": recipients},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning(f"Rule lookup failed: {e}")
        return None

    async def get_sender_profile(self, email: str) -> dict | None:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.backend_url}/api/senders/by-email/{email}",
                    headers=_INTERNAL_HDR,
                    timeout=aiohttp.ClientTimeout(total=2),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning(f"Sender profile lookup failed: {e}")
        return None

    async def get_campaign_banner(self) -> dict | None:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.backend_url}/api/campaigns/pick",
                    headers=_INTERNAL_HDR,
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning(f"Campaign banner fetch failed: {e}")
        return None

    async def get_enrichment(self, rule: dict, message: Message) -> dict | None:
        if rule.get("enrichment_source") != "lexware":
            return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.backend_url}/api/enrichment/lexware",
                    headers=_INTERNAL_HDR,
                    json={"message_subject": message.get("Subject", "")},
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning(f"Enrichment fetch failed: {e}")
        return None
