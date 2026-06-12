"""
Signaturmonster — Mail Command Parser

Scans the message body for #sm: control lines, strips them, and returns a flags
dict that the handler uses to selectively disable processing steps.

Supported commands (case-insensitive, on a line/block of their own):
  #sm:nosig         — skip signature injection (CI beautifier still applies)
  #sm:nobanner      — skip campaign banner
  #sm:nodisclaimer  — skip disclaimer
  #sm:noci          — skip CI beautifier / branding (plain signature inject only)
  #sm:off           — disable all of the above
"""

import base64
import logging
import re
from email.message import Message

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_CMD_RE = re.compile(
    r"^#sm:(nosig|nobanner|nodisclaimer|noci|off)$",
    re.IGNORECASE,
)

# Block-level elements where a command might be placed on its own
_BLOCK_TAGS = ["p", "div", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"]


def parse_commands(message: Message) -> dict:
    """
    Detect and strip #sm: commands from all text/plain and text/html parts.
    Modifies the message in place (command lines/elements are removed).
    Returns a flags dict.
    """
    flags = {
        "nosig":        False,
        "nobanner":     False,
        "nodisclaimer": False,
        "noci":         False,
        "off":          False,
    }

    if message.is_multipart():
        for part in message.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                _process_text(part, flags)
            elif ct == "text/html":
                _process_html(part, flags)
    else:
        ct = message.get_content_type()
        if ct == "text/plain":
            _process_text(message, flags)
        elif ct == "text/html":
            _process_html(message, flags)

    # #sm:off implies all individual flags
    if flags["off"]:
        flags["nosig"] = flags["nobanner"] = flags["nodisclaimer"] = flags["noci"] = True

    if any(flags.values()):
        active = [k for k, v in flags.items() if v]
        logger.info(f"Mail commands detected: {active}")

    return flags


def _process_text(part: Message, flags: dict):
    try:
        charset = part.get_content_charset() or "utf-8"
        text = part.get_payload(decode=True).decode(charset, errors="replace")
        kept = []
        for line in text.splitlines():
            m = _CMD_RE.match(line.strip())
            if m:
                flags[m.group(1).lower()] = True
            else:
                kept.append(line)
        part.set_payload("\n".join(kept), charset=charset)
    except Exception as e:
        logger.warning(f"Command parse (text) failed: {e}")


def _process_html(part: Message, flags: dict):
    try:
        charset = part.get_content_charset() or "utf-8"
        html = part.get_payload(decode=True).decode(charset, errors="replace")
        soup = BeautifulSoup(html, "lxml")
        changed = False
        for tag in soup.find_all(_BLOCK_TAGS):
            m = _CMD_RE.match(tag.get_text(strip=True))
            if m:
                flags[m.group(1).lower()] = True
                tag.decompose()
                changed = True
        if changed:
            new_html = str(soup)
            encoded = base64.encodebytes(new_html.encode("utf-8")).decode("ascii")
            part.set_param("charset", "utf-8")
            if "content-transfer-encoding" in part:
                del part["content-transfer-encoding"]
            part["Content-Transfer-Encoding"] = "base64"
            part.set_payload(encoded)
    except Exception as e:
        logger.warning(f"Command parse (html) failed: {e}")
