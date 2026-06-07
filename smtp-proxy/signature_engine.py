import logging
from email.message import Message
from beautifier import MailBeautifier

logger = logging.getLogger(__name__)

class SignatureEngine:

    def __init__(self):
        self.beautifier = MailBeautifier()

    async def inject(self, message: Message, signature: dict, enrichment: dict | None = None, ci: dict | None = None, sender: dict | None = None, disclaimer: dict | None = None) -> Message:
        context = {}
        if sender:
            context.update(self._sender_context(sender))
        if enrichment:
            context.update(enrichment)
        context["disclaimer_html"] = disclaimer.get("html_content", "") if disclaimer else ""
        context["disclaimer_text"] = disclaimer.get("text_content", "") if disclaimer else ""
        html_sig  = self._render(signature.get("html_content", ""), context)
        text_sig  = self._render(signature.get("text_content", ""), context)
        use_branding = bool(ci)  # CI-Dict vorhanden → Branding-Modus

        if message.is_multipart():
            for part in message.walk():
                ct = part.get_content_type()
                if ct == "text/html":
                    if use_branding:
                        self._beautify_html(part, html_sig, ci)
                    else:
                        self._inject_html(part, html_sig)
                elif ct == "text/plain" and not html_sig:
                    self._inject_text(part, text_sig)
        else:
            ct = message.get_content_type()
            if ct == "text/html":
                if use_branding:
                    self._beautify_html(message, html_sig, ci)
                else:
                    self._inject_html(message, html_sig)
            else:
                self._inject_text(message, text_sig)

        return message

    def _set_html_payload(self, part: Message, html: str):
        """Setzt HTML-Payload mit korrektem UTF-8/Base64-Encoding.

        Python's set_payload() aktualisiert Content-Transfer-Encoding nur wenn
        der Header noch fehlt — bei bereits gesetztem CTE bleibt der alte Wert
        stehen, obwohl der Inhalt jetzt anders kodiert ist. Striktes Überschreiben
        verhindert CTE-Mismatches bei mobilen Clients.
        """
        import base64
        payload_bytes = html.encode("utf-8")
        b64 = base64.encodebytes(payload_bytes).decode("ascii")
        part.set_param("charset", "utf-8")
        if "content-transfer-encoding" in part:
            del part["content-transfer-encoding"]
        part["Content-Transfer-Encoding"] = "base64"
        part.set_payload(b64)

    def _beautify_html(self, part: Message, sig_html: str, ci: dict):
        """Modus 2: Text bereinigen + CI-Wrapper + Signatur."""
        try:
            charset = part.get_content_charset() or "utf-8"
            content = part.get_payload(decode=True).decode(charset)
            beautified = self.beautifier.beautify(content, ci, sig_html)
            self._set_html_payload(part, beautified)
        except Exception as e:
            logger.error(f"Beautify failed, falling back to inject: {e}")
            self._inject_html(part, sig_html)

    def _inject_html(self, part: Message, sig_html: str):
        """Modus 1: Nur Signatur anhängen, HTML unangetastet."""
        try:
            charset = part.get_content_charset() or "utf-8"
            content = part.get_payload(decode=True).decode(charset)
            sig_block = f'\n<div class="sm-sig">{sig_html}</div>'
            lower = content.lower()
            pos = lower.rfind("</body>")
            if pos != -1:
                new_content = content[:pos] + sig_block + content[pos:]
            else:
                new_content = content + sig_block
            self._set_html_payload(part, new_content)
        except Exception as e:
            logger.error(f"HTML injection failed: {e}")

    def _inject_text(self, part: Message, sig_text: str):
        try:
            charset = part.get_content_charset() or "utf-8"
            content = part.get_payload(decode=True).decode(charset)
            part.set_payload(f"{content}\n\n-- \n{sig_text}", charset=charset)
        except Exception as e:
            logger.error(f"Text injection failed: {e}")

    def _sender_context(self, sender: dict) -> dict:
        first       = sender.get("first_name")  or ""
        last        = sender.get("last_name")   or ""
        street      = sender.get("street")      or ""
        postal_code = sender.get("postal_code") or ""
        city        = sender.get("city")        or ""
        country     = sender.get("country")     or ""
        addr_parts  = [street, f"{postal_code} {city}".strip(), country]
        full_address = ", ".join(p for p in addr_parts if p)
        return {
            "vorname":           first,
            "nachname":          last,
            "name":              f"{first} {last}".strip(),
            "email":             sender.get("email")     or "",
            "berufsbezeichnung": sender.get("job_title") or "",
            "firma":             sender.get("company")   or "",
            "telefon":           sender.get("phone")     or "",
            "mobil":             sender.get("mobile")    or "",
            "strasse":           street,
            "plz":               postal_code,
            "ort":               city,
            "land":              country,
            "adresse":           full_address,
            "foto":              sender.get("photo_url") or "",
        }

    def _render(self, template: str, data: dict) -> str:
        for k, v in data.items():
            template = template.replace(f"{{{{{k}}}}}", str(v))
        return template
