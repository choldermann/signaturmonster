import asyncio
import base64
import json
import logging
import time
from aiosmtpd.handlers import AsyncMessage
from email.message import Message
from signature_engine import SignatureEngine
from rule_engine import RuleEngine
from relay import SMTPRelay
from commands import parse_commands

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
        from email import message_from_bytes
        message = message_from_bytes(envelope.content)
        addon_injected = b"<!--SM-ADDON-INJECTED-->" in envelope.content
        await self.handle_message(message, rcpt_tos=list(envelope.rcpt_tos), addon_injected=addon_injected)
        return "250 Message accepted for delivery"

    async def handle_message(self, message: Message, rcpt_tos: list | None = None, addon_injected: bool = False):
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

        # Parse and strip #sm: control commands before any other processing
        commands = parse_commands(message)

        # Thunderbird addon embeds <!--SM-ADDON-INJECTED--> in the HTML body.
        # additionalHeaders from onBeforeSend are not forwarded by Thunderbird.
        if addon_injected:
            commands["nosig"] = True
            logger.info("SM-ADDON-INJECTED marker detected: skipping signature injection")

        logger.info(f"Processing mail from: {sender_email}")

        action            = "no_rule"
        rule_id           = None
        rule_name         = ""
        signature_name    = ""
        smtp_account      = None
        forward_addresses = []

        try:
            rule = await self.rule_engine.get_rule(sender_header, message)
            if rule:
                action         = "signed"
                rule_id        = rule.get("rule_id")
                rule_name      = rule.get("signature", {}).get("name", "") or ""
                signature_name = rule_name
                smtp_account   = rule.get("smtp_account") or None
                forward_raw    = rule.get("forward_to", "") or ""
                forward_addresses = [a.strip() for a in forward_raw.split(",") if a.strip()]

                sender_profile, enrichment, campaign = await asyncio.gather(
                    self.rule_engine.get_sender_profile(sender_email),
                    self.rule_engine.get_enrichment(rule, message),
                    self.rule_engine.get_campaign_banner(),
                )
                ci         = rule.get("ci_config")  or None
                disclaimer = rule.get("disclaimer") or None
                powered_by = rule.get("powered_by", True)

                # Apply #sm: command overrides
                if commands["noci"]:         ci = None
                if commands["nodisclaimer"]: disclaimer = None
                if commands["nobanner"]:     campaign = None
                sig = rule["signature"] if not commands["nosig"] else {"html_content": "", "text_content": ""}

                if not commands["off"]:
                    message = await self.signature_engine.inject(
                        message, sig, enrichment,
                        ci=ci, sender=sender_profile, disclaimer=disclaimer,
                        powered_by=powered_by and not commands["nosig"],
                        campaign=campaign,
                    )
                mode = "branded" if ci else "signature"
                logger.info(f"[{mode}] Signature '{rule['signature']['name']}' injected for {sender_email}")
        except Exception as e:
            logger.error(f"Error processing mail: {e}")
            action = "error"

        # Enqueue for retry safety (best-effort, non-blocking)
        queue_id = None
        try:
            msg_b64    = base64.b64encode(message.as_bytes()).decode()
            smtp_json  = json.dumps(smtp_account) if smtp_account else ""
            queue_id   = await self.rule_engine.enqueue_mail({
                "sender":            sender_email,
                "recipients":        recipients,
                "subject":           subject[:200],
                "message_b64":       msg_b64,
                "smtp_account_json": smtp_json,
                "rcpt_tos_json":     json.dumps(rcpt_tos) if rcpt_tos else "",
            })
        except Exception as e:
            logger.warning(f"Queue enqueue failed (proceeding without queue): {e}")

        relay_ok    = True
        relay_error = ""
        try:
            await self.relay.send(message, sender_email=sender_email, smtp_account=smtp_account, rcpt_tos=rcpt_tos)
            if queue_id:
                asyncio.ensure_future(self.rule_engine.mark_sent(queue_id))
            for fwd_addr in forward_addresses:
                try:
                    await self.relay.send(message, sender_email=sender_email, smtp_account=smtp_account, rcpt_tos=[fwd_addr])
                    logger.info(f"Forward copy sent to {fwd_addr} for rule {rule_id}")
                except Exception as fe:
                    logger.warning(f"Forward copy to {fwd_addr} failed: {fe}")
        except Exception as e:
            relay_ok    = False
            relay_error = str(e)[:300]
            logger.error(f"Relay failed for {sender_email}: {e}")
            if queue_id:
                asyncio.ensure_future(self.rule_engine.mark_failed(queue_id, relay_error))

        duration_ms = int((time.time() - t0) * 1000)
        msg_size    = len(message.as_bytes())

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
