import asyncio
import base64
import json
import logging
from email import message_from_bytes
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
    queue_id = entry["id"]
    sender   = entry.get("sender", "")
    try:
        raw      = base64.b64decode(entry["message_b64"])
        message  = message_from_bytes(raw)
        smtp_acc = json.loads(entry["smtp_account_json"]) if entry.get("smtp_account_json") else None
        await relay.send(message, sender_email=sender, smtp_account=smtp_acc)
        await rule_engine.mark_sent(queue_id)
        logger.info(f"Retry succeeded for queue entry {queue_id} (sender={sender})")
    except Exception as e:
        error = str(e)[:300]
        logger.warning(f"Retry failed for queue entry {queue_id}: {error}")
        await rule_engine.mark_failed(queue_id, error)
