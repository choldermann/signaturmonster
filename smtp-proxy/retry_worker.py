import asyncio
import base64
import json
import logging
from email import message_from_bytes
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from relay import SMTPRelay
from rule_engine import RuleEngine

logger = logging.getLogger(__name__)

RETRY_INTERVAL = 30  # seconds between polling cycles

async def run(rule_engine: RuleEngine):
    relay = SMTPRelay()
    logger.info("Mail-Queue retry worker started")
    while True:
        await asyncio.sleep(RETRY_INTERVAL)
        try:
            entries = await rule_engine.get_pending_queue()
            if not entries:
                continue
            logger.info(f"Retry worker: {len(entries)} pending entries")
            for entry in entries:
                await _retry_one(entry, relay, rule_engine)
        except Exception as e:
            logger.warning(f"Retry worker cycle error: {e}")

async def _retry_one(entry: dict, relay: SMTPRelay, rule_engine: RuleEngine):
    queue_id     = entry["id"]
    sender       = entry.get("sender", "")
    attempts     = entry.get("attempts", 0)
    max_attempts = entry.get("max_attempts", 5)
    try:
        raw      = base64.b64decode(entry["message_b64"])
        message  = message_from_bytes(raw)
        smtp_acc = json.loads(entry["smtp_account_json"]) if entry.get("smtp_account_json") else None
        rcpt_tos = json.loads(entry["rcpt_tos_json"]) if entry.get("rcpt_tos_json") else None
        await relay.send(message, sender_email=sender, smtp_account=smtp_acc, rcpt_tos=rcpt_tos)
        await rule_engine.mark_sent(queue_id)
        logger.info(f"Retry succeeded for queue entry {queue_id} (sender={sender})")
    except Exception as e:
        error = str(e)[:300]
        logger.warning(f"Retry failed for queue entry {queue_id}: {error}")
        await rule_engine.mark_failed(queue_id, error)
        # Send bounce notification after the final attempt
        if attempts + 1 >= max_attempts and sender:
            await _send_bounce(entry, error, relay, smtp_acc)

async def _send_bounce(entry: dict, error: str, relay: SMTPRelay, smtp_acc: dict | None):
    sender    = entry.get("sender", "")
    subject   = entry.get("subject", "(kein Betreff)")
    recipients = entry.get("recipients", "")
    queue_id  = entry["id"]
    try:
        bounce = MIMEMultipart("alternative")
        bounce["From"]    = "mailer-daemon@signaturmonster"
        bounce["To"]      = sender
        bounce["Subject"] = f"Unzustellbar: {subject}"

        plain = (
            f"Ihre E-Mail konnte nicht zugestellt werden.\n\n"
            f"Empfänger : {recipients}\n"
            f"Betreff   : {subject}\n"
            f"Fehler    : {error}\n\n"
            f"Die Nachricht wurde nach {entry.get('max_attempts', 5)} Versuchen "
            f"aus der Warteschlange entfernt (Queue-ID: {queue_id}).\n"
        )
        html = (
            "<p>Ihre E-Mail konnte nicht zugestellt werden.</p>"
            "<table style='font-family:monospace;font-size:13px'>"
            f"<tr><td><b>Empfänger</b></td><td>{recipients}</td></tr>"
            f"<tr><td><b>Betreff</b></td><td>{subject}</td></tr>"
            f"<tr><td><b>Fehler</b></td><td style='color:#c00'>{error}</td></tr>"
            f"<tr><td><b>Queue-ID</b></td><td>{queue_id}</td></tr>"
            "</table>"
            f"<p>Die Nachricht wurde nach <b>{entry.get('max_attempts', 5)} Versuchen</b> "
            "aus der Warteschlange entfernt.</p>"
        )
        bounce.attach(MIMEText(plain, "plain", "utf-8"))
        bounce.attach(MIMEText(html,  "html",  "utf-8"))

        await relay.send(bounce, sender_email="", smtp_account=smtp_acc, rcpt_tos=[sender])
        logger.info(f"Bounce notification sent to {sender} for queue entry {queue_id}")
    except Exception as ex:
        logger.warning(f"Failed to send bounce for queue entry {queue_id}: {ex}")
