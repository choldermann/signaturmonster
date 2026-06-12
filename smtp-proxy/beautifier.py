"""
Signaturmonster — Mail Beautifier
Normalisiert HTML-Mails und packt sie in einen CI-Wrapper.
"""
import re
import logging
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# Only strip CI-controlled layout properties.
# color, background-color, font-size are intentional user formatting and must be preserved.
STRIP_STYLE_PROPS = [
    r'font-family\s*:[^;]+;?',
    r'line-height\s*:[^;]+;?',
    r'margin\s*:[^;]+;?',
    r'padding\s*:[^;]+;?',
]

DEFAULT_CI = {
    "primary_color":   "#fce499",
    "text_color":      "#333333",
    "bg_color":        "#ffffff",
    "content_bg":      "#ffffff",
    "header_bg":       "#242424",
    "font_family":     "Arial, Helvetica, sans-serif",
    "font_size":       "14px",
    "line_height":     "1.6",
    "container_width": "620",
    "logo_url":        "",
    "company_name":    "",
    "show_header":     True,
    "show_footer":     True,
    "footer_text":     "",
    "border":          "1px solid #dddddd",
}


class MailBeautifier:

    def beautify(self, html_content: str, ci: dict, signature_html: str = "") -> str:
        cfg = {**DEFAULT_CI, **ci}
        clean_content = self._extract_and_clean(html_content, cfg)
        return self._wrap_in_ci(clean_content, cfg, signature_html)

    def _extract_and_clean(self, html: str, cfg: dict) -> str:
        try:
            soup = BeautifulSoup(html, "lxml")
            body = soup.body or soup

            for tag in body.find_all(style=True):
                clean_style = self._clean_style(tag.get("style", ""))
                if clean_style:
                    tag["style"] = clean_style
                else:
                    del tag["style"]

            for font_tag in body.find_all("font"):
                # Preserve color as inline style, drop layout attributes (face, size)
                color = font_tag.get("color")
                font_tag.attrs = {}
                if color:
                    font_tag["style"] = f"color:{color}"

            for tag in body.find_all(class_=re.compile(r'moz-|MsoNormal|WordSection')):
                if "class" in tag.attrs:
                    tag["class"] = [c for c in tag.get("class", [])
                                    if not re.match(r'moz-|MsoNormal|WordSection', c)]

            for sig in body.find_all(class_=re.compile(r'moz-signature|sm-sig')):
                sig.decompose()

            self._remove_trailing_empty(body)
            return str(body)

        except Exception as e:
            logger.error(f"HTML cleanup failed: {e}")
            return html

    def _clean_style(self, style: str) -> str:
        if not style:
            return ""
        result = style
        for pattern in STRIP_STYLE_PROPS:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)
        result = re.sub(r'\s+', ' ', result).strip().strip(';')
        return result

    def _remove_trailing_empty(self, tag):
        while tag.contents:
            last = tag.contents[-1]
            if isinstance(last, Tag):
                text = last.get_text(strip=True)
                has_img = bool(last.find("img"))
                if not text and not has_img:
                    last.decompose()
                    continue
            break

    def _wrap_in_ci(self, content: str, cfg: dict, signature_html: str) -> str:
        # Header
        header = ""
        if cfg.get("show_header") and (cfg.get("logo_url") or cfg.get("company_name")):
            logo = ""
            if cfg.get("logo_url"):
                logo = '<td width="1" valign="middle" style="padding-right:10px;white-space:nowrap;">'
                logo += '<img src="' + cfg["logo_url"] + '" alt="' + cfg.get("company_name", "") + '" height="50" style="height:50px;width:auto;display:block;border:0;" />'
                logo += '</td>'
            name = ""
            if cfg.get("company_name"):
                name = '<td valign="middle" style="padding-left:4px;">'
                name += '<span style="font-size:18px;font-weight:bold;color:' + cfg["primary_color"] + ';white-space:nowrap;">' + cfg["company_name"] + '</span>'
                name += '</td>'
            header = (
                "<tr>"
                "<td style=\"background:" + cfg["header_bg"] + ";padding:16px 28px;border-radius:12px 12px 0 0;\">"
                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>"
                + logo + name +
                "</tr></table>"
                "</td>"
                "</tr>"
            )

        # Footer
        footer = ""
        if cfg.get("show_footer") and cfg.get("footer_text"):
            footer = (
                "<tr>"
                "<td style=\"background:" + cfg["header_bg"] + ";padding:12px 28px;"
                "border-top:1px solid #333;border-radius:0 0 12px 12px;"
                "font-size:11px;color:#888;\">"
                + cfg["footer_text"] +
                "</td>"
                "</tr>"
            )

        # Signature block
        sig_block = ""
        if signature_html:
            sig_block = (
                "<tr>"
                "<td style=\"padding:0 28px 20px;\">"
                "<div style=\"border-top:1px solid #eeeeee;padding-top:14px;margin-top:4px;\">"
                + signature_html +
                "</div>"
                "</td>"
                "</tr>"
            )

        border = cfg.get("border", "1px solid #dddddd")
        content_bg = cfg.get("content_bg", "#ffffff")
        container_width = cfg.get("container_width", "620")

        return (
            "<!DOCTYPE html>\n"
            "<html lang=\"de\">\n"
            "<head>\n"
            "<meta charset=\"UTF-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
            "</head>\n"
            "<body style=\"margin:0;padding:0;"
            "font-family:" + cfg["font_family"] + ";color:" + cfg["text_color"] + ";\">\n"
            "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" "
            "style=\"padding:20px 0;\">\n"
            "<tr><td align=\"center\">\n"
            "<table width=\"" + container_width + "\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" "
            "style=\"width:" + container_width + "px;max-width:" + container_width + "px;"
            "background:" + content_bg + ";border-radius:12px;border:" + border + ";\">\n"
            + header +
            "<tr>"
            "<td style=\"padding:24px 28px;font-family:" + cfg["font_family"] + ";"
            "font-size:" + cfg["font_size"] + ";line-height:" + cfg["line_height"] + ";"
            "color:" + cfg["text_color"] + ";\">"
            + content +
            "</td>"
            "</tr>\n"
            + sig_block
            + footer +
            "</table>\n"
            "</td></tr></table>\n"
            "</body></html>"
        )
