import base64 as _b64
import io
import logging
import re
import uuid
from email.message import Message
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from beautifier import MailBeautifier

try:
    from PIL import Image as _PILImage
    _PIL_OK = True
except ImportError:
    _PIL_OK = False

logger = logging.getLogger(__name__)

POWERED_BY_HTML = (
    '\n<table width="100%" cellpadding="0" cellspacing="0" border="0">'
    '<tr><td align="center" bgcolor="#181818" style="background-color:#181818;'
    'padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;">'
    '<a href="https://signaturmonster.monstersuite.de" style="text-decoration:none;">'
    '<span style="color:#888888;">powered&nbsp;by&nbsp;</span>'
    '<span style="color:#fce499;">Signatur</span>'
    '<span style="color:#ffffff;">monster</span>'
    '</a></td></tr></table>'
)

# Matches: src="data:image/gif;base64,AAA..." (single or double quotes)
_DATA_URI_RE = re.compile(
    r'(src=["\'])data:(image/[\w+]+);base64,([A-Za-z0-9+/=\s]+?)(["\'])',
    re.DOTALL,
)

class SignatureEngine:

    def __init__(self):
        self.beautifier = MailBeautifier()

    async def inject(self, message: Message, signature: dict, enrichment: dict | None = None, ci: dict | None = None, sender: dict | None = None, disclaimer: dict | None = None, powered_by: bool = True, campaign: dict | None = None) -> Message:
        context = {}
        if sender:
            context.update(self._sender_context(sender))
        if enrichment:
            context.update(enrichment)
        context["disclaimer_html"]      = disclaimer.get("html_content", "") if disclaimer else ""
        context["disclaimer_text"]      = disclaimer.get("text_content", "") if disclaimer else ""
        context["campaign_banner"]      = campaign.get("html", "") if campaign else ""
        context["campaign_banner_text"] = campaign.get("text", "") if campaign else ""
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

        if powered_by:
            if message.is_multipart():
                for part in message.walk():
                    if part.get_content_type() == "text/html":
                        self._inject_powered_by(part)
            elif message.get_content_type() == "text/html":
                self._inject_powered_by(message)

        # Convert embedded data:image URIs to CID inline attachments
        # so Gmail (which strips data: URIs) still shows the banner.
        message = self._convert_data_uris_to_cid(message)

        return message

    def _convert_data_uris_to_cid(self, message: Message) -> Message:
        """Replace data:image/* URIs with CID inline attachments.

        Produces an Outlook + Gmail compatible structure:

          multipart/mixed                     (when text/plain exists)
            text/plain
            multipart/related; type="text/html"
              text/html          ← CID refs
              image/gif

        OR (HTML-only mails):

          multipart/related; type="text/html"
            text/html
            image/gif

        Outlook's Word engine requires multipart/related to directly wrap
        text/html — having multipart/alternative in between breaks it.
        """
        collected: list = []  # [(cid, subtype_str, bytes)]

        def _replace(m):
            subtype = m.group(2).split("/")[1].split("+")[0].lower()
            raw     = re.sub(r"\s+", "", m.group(3))
            cid     = f"sm{uuid.uuid4().hex[:12]}@sig"
            try:
                collected.append((cid, subtype, _b64.b64decode(raw)))
            except Exception:
                return m.group(0)
            return f'{m.group(1)}cid:{cid}{m.group(4)}'

        def _strip_mv(msg):
            while "MIME-Version" in msg:
                del msg["MIME-Version"]

        # ── Step 1: extract + replace HTML and plain-text content ──
        html_content:  str | None = None
        html_cs:       str        = "utf-8"
        plain_content: str | None = None
        plain_cs:      str        = "utf-8"

        def _extract(msg):
            nonlocal html_content, html_cs, plain_content, plain_cs
            ct = msg.get_content_type()
            if ct == "text/html" and html_content is None:
                cs       = msg.get_content_charset() or "utf-8"
                raw_html = msg.get_payload(decode=True).decode(cs, errors="replace")
                html_content = _DATA_URI_RE.sub(_replace, raw_html)
                html_cs  = cs
            elif ct == "text/plain" and plain_content is None:
                cs            = msg.get_content_charset() or "utf-8"
                plain_content = msg.get_payload(decode=True).decode(cs, errors="replace")
                plain_cs      = cs
            elif msg.is_multipart():
                for part in msg.get_payload():
                    _extract(part)

        _extract(message)

        if not collected or html_content is None:
            return message

        # ── Step 2: build image parts + MSO static fallback for GIFs ──
        img_parts: list = []
        # gif_fallbacks: maps animated cid → static png cid (for MSO conditionals)
        gif_fallbacks: dict = {}

        for cid, sub, data in collected:
            img = MIMEImage(data, _subtype=sub)
            _strip_mv(img)
            img.add_header("Content-ID", f"<{cid}>")
            img.add_header("Content-Location", cid)
            img.add_header("Content-Disposition", "inline", filename=f"banner.{sub}")
            img_parts.append(img)

            # For animated GIFs: extract first frame as static PNG for Outlook.
            # Outlook's Word engine ignores GIF animation; the MSO conditional block
            # shows the static PNG to Outlook and the animated GIF to everyone else.
            if sub == "gif" and _PIL_OK:
                try:
                    pil_img = _PILImage.open(io.BytesIO(data))
                    pil_img.seek(0)
                    # Robust palette→RGB conversion: composites the first frame onto
                    # a white background so transparency doesn't produce a black PNG.
                    frame = pil_img.copy()
                    if frame.mode in ("P", "PA"):
                        rgba = frame.convert("RGBA")
                        bg = _PILImage.new("RGBA", rgba.size, (255, 255, 255, 255))
                        bg.paste(rgba, mask=rgba.split()[3])
                        frame = bg.convert("RGB")
                    elif frame.mode != "RGB":
                        frame = frame.convert("RGB")
                    png_buf = io.BytesIO()
                    frame.save(png_buf, "PNG", optimize=True)
                    static_cid = f"sm{uuid.uuid4().hex[:12]}@sig-s"
                    static_img = MIMEImage(png_buf.getvalue(), _subtype="png")
                    _strip_mv(static_img)
                    static_img.add_header("Content-ID", f"<{static_cid}>")
                    static_img.add_header("Content-Location", static_cid)
                    static_img.add_header("Content-Disposition", "inline",
                                          filename="banner-static.png")
                    img_parts.append(static_img)
                    gif_fallbacks[cid] = static_cid
                except Exception as e:
                    logger.warning("GIF static fallback failed: %s", e)

        # Wrap animated GIF img tags with MSO conditional comments so Outlook
        # shows the static PNG while all other clients see the animated GIF.
        if gif_fallbacks:
            _gif_img_re = re.compile(
                r'<img\b([^>]*?)src=["\']cid:({cids})["\']([^>]*?)(/?)>'
                .replace("{cids}", "|".join(re.escape(c) for c in gif_fallbacks)),
                re.IGNORECASE | re.DOTALL,
            )
            def _wrap_gif(m):
                before, cid_val, after, slash = m.group(1), m.group(2), m.group(3), m.group(4)
                static = gif_fallbacks[cid_val]
                animated_tag = f'<img{before}src="cid:{cid_val}"{after}{slash}>'
                static_tag   = f'<img{before}src="cid:{static}"{after}{slash}>'
                return (
                    f'<!--[if mso]>{static_tag}<![endif]-->'
                    f'<!--[if !mso]><!-->{ animated_tag}<!--<![endif]-->'
                )
            html_content = _gif_img_re.sub(_wrap_gif, html_content)

        # ── Step 3: multipart/related; type="text/html" ──
        # RFC 2387: first part is the root resource when no "start" param is given.
        # Adding Content-ID to the HTML part causes Thunderbird to treat it as an
        # inline resource (not displayable body), so we intentionally omit it and
        # rely on the first-part-is-root convention instead.
        html_sub = MIMEText(html_content, "html", html_cs)
        _strip_mv(html_sub)

        related = MIMEMultipart("related", type="text/html")
        _strip_mv(related)
        related.attach(html_sub)
        for img in img_parts:
            related.attach(img)

        # ── Step 4: rebuild message in-place ──
        new_boundary = uuid.uuid4().hex
        while "Content-Type"             in message: del message["Content-Type"]
        while "Content-Transfer-Encoding" in message: del message["Content-Transfer-Encoding"]

        if plain_content is not None:
            plain_sub = MIMEText(plain_content, "plain", plain_cs)
            _strip_mv(plain_sub)
            message["Content-Type"] = f'multipart/mixed; boundary="{new_boundary}"'
            message._payload = [plain_sub, related]
        else:
            message["Content-Type"] = f'multipart/related; type="text/html"; boundary="{new_boundary}"'
            message._payload = [html_sub] + img_parts

        logger.info(
            "CID conversion: %d image(s) embedded; root=%s; html_len=%d",
            len(collected),
            "multipart/mixed" if plain_content is not None else "multipart/related",
            len(html_content),
        )
        logger.info("MIME tree:\n%s", self._dump_mime_tree(message))

        return message

    def _dump_mime_tree(self, msg: Message, indent: int = 0) -> str:
        line = "  " * indent + msg.get_content_type()
        params = msg.get_params() or []
        extras = "; ".join(f"{k}={v}" for k, v in params if k != "content-type")
        if extras:
            line += f" [{extras}]"
        if msg.get("Content-ID"):
            line += f"  cid={msg['Content-ID']}"
        lines = [line]
        if msg.is_multipart():
            for sub in msg.get_payload():
                lines.append(self._dump_mime_tree(sub, indent + 1))
        return "\n".join(lines)

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

    def _inject_powered_by(self, part: Message):
        try:
            charset = part.get_content_charset() or "utf-8"
            content = part.get_payload(decode=True).decode(charset)
            lower = content.lower()
            pos = lower.rfind("</body>")
            if pos != -1:
                new_content = content[:pos] + POWERED_BY_HTML + content[pos:]
            else:
                new_content = content + POWERED_BY_HTML
            self._set_html_payload(part, new_content)
        except Exception as e:
            logger.error(f"Powered-by injection failed: {e}")

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
