import asyncio
import logging
import time
from aiosmtpd.handlers import AsyncMessage
from email.message import Message
from signature_engine import SignatureEngine
from rule_engine import RuleEngine
from relay import SMTPRelay

logger = logging.getLogger(__name__)

class SignaturmonsterHandler(AsyncMessage):
    def __init__(self, backend_url: str, rate_limiter=None):
        super().__init__()
        self.rule_engine      = RuleEngine(backend_url)
        self.signature_engine = SignatureEngine()
        self.relay            = SMTPRelay()
        self.rate_limiter     = rate_limiter

    async def handle_DATA(self, server, session, envelope):
        if self.rate_limiter:
            ip = session.peer[0] if session.peer else "unknown"
            if not self.rate_limiter.check(ip):
                return "451 4.7.1 Rate limit exceeded, please try again later"
        return await super().handle_DATA(server, session, envelope)

    async def handle_message(self, message: Message):
        t0            = time.time()
        sender_header = message.get("From", "")
        sender_email  = self.rule_engine._extract_address(sender_header)
        to_raw        = message.get("To",  "") or ""
        cc_raw        = message.get("Cc",  "") or ""
        subject       = message.get("Subject", "") or ""
        recipients    = ", ".join(
            self.rule_engine._extract_addresses(to_raw) +
            self.rule_engine._extract_addresses(cc_raw)
        )
        msg_size      = len(message.as_bytes())

        logger.info(f"Processing mail from: {sender_email}")

        action         = "no_rule"
        rule_id        = None
        rule_name      = ""
        signature_name = ""
        smtp_account   = None

        try:
            rule = await self.rule_engine.get_rule(sender_header, message)
            if rule:
                action       = "signed"
                rule_id      = rule.get("rule_id")
                rule_name    = rule.get("signature", {}).get("name", "") or ""
                signature_name = rule_name
                smtp_account = rule.get("smtp_account") or None

                sender_profile, enrichment, campaign = await asyncio.gather(
                    self.rule_engine.get_sender_profile(sender_email),
                    self.rule_engine.get_enrichment(rule, message),
                    self.rule_engine.get_campaign_banner(),
                )
                ci         = rule.get("ci_config")  or None
                disclaimer = rule.get("disclaimer") or None
                powered_by = rule.get("powered_by", True)
                message = await self.signature_engine.inject(
                    message,
                    rule["signature"],
                    enrichment,
                    ci=ci,
                    sender=sender_profile,
                    disclaimer=disclaimer,
                    powered_by=powered_by,
                    campaign=campaign,
                )
                mode = "branded" if ci else "signature"
                logger.info(f"[{mode}] Signature '{rule['signature']['name']}' injected for {sender_email}")
        except Exception as e:
            logger.error(f"Error processing mail: {e}")
            action = "error"

        relay_ok    = True
        relay_error = ""
        try:
            await self.relay.send(message, sender_email=sender_email, smtp_account=smtp_account)
        except Exception as e:
            relay_ok    = False
            relay_error = str(e)[:300]
            logger.error(f"Relay failed for {sender_email}: {e}")

        duration_ms = int((time.time() - t0) * 1000)

        asyncio.ensure_future(self.rule_engine.log_mail({
            "sender":         sender_email,
            "recipients":     recipients,
            "subject":        subject[:200],
            "rule_id":        rule_id,
            "rule_name":      rule_name,
            "signature_name": signature_name,
            "action":         action,
            "relay_ok":       relay_ok,
            "relay_error":    relay_error,
            "duration_ms":    duration_ms,
            "message_size":   msg_size,
        }))
