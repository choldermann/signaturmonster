import re
from typing import Any

SAMPLE_DATA = {
    "anrede": "Frau",
    "nachname": "Stahlberger",
    "firma": "Hausverwaltung Stahlberger",
    "strasse": "Bernsteinstr. 11",
    "ort": "76461 Muggensturm",
    "angebotsnummer": "ANG-2026-001",
    "datum": "26.05.2026",
    "gueltig_bis": "30.06.2026",
    "gesamtpreis": "1.576,00 €",
    "positions": [
        {"artikelnummer": "100669388", "name": "APPLE iPad Pro 11\" M5 Wi-Fi 512GB Space Black", "description": "Tandem-OLED-Display, ProMotion-Technologie, M5-Chip.", "preis": "1.199,00 €", "bildUrl": "{https://holdermann.me/Angebote/c7b874812d9451da491baa9c51a09bc9.webp}"},
        {"artikelnummer": "100515903", "name": "Apple Pencil Pro – Weiß – Bluetooth", "description": "Magnetisch befestigen, automatisch koppeln und kabellos laden.", "preis": "149,00 €", "bildUrl": "{https://holdermann.me/Angebote/d6d3c6baa9a82acb831b96d55df016e8.webp}"},
        {"artikelnummer": "100499439", "name": "Apple Netzteil 70 Watt USB-C", "description": "70W USB-C Ladelösung.", "preis": "79,00 €", "bildUrl": ""},
    ]
}

def extract_image_url(val: str) -> str:
    if not val: return ""
    m = re.search(r'\{(https?://[^}]+)\}', val)
    return m.group(1) if m else ""

def render_value(template: str, data: dict) -> str:
    return re.sub(r'\{\{(\w+)\}\}', lambda m: str(data.get(m.group(1), f'{{{{{m.group(1)}}}}}') ), template)

def render_block(block: dict, data: dict) -> str:
    t = block["type"]
    p = block["props"]

    if t == "header":
        logo = f'<img src="{p["logoUrl"]}" width="80" alt="Logo" style="border-radius:8px;display:block">' if p.get("logoUrl") else ''
        return f'''
<tr><td style="padding:34px 38px 20px 38px;background:{p["bgColor"]};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="top">
      <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:{p["accentColor"]};font-weight:bold;">{p["companyName"]}</div>
      <div style="font-size:28px;line-height:34px;color:{p["accentColor"]};font-weight:bold;margin-top:6px;">Ihr individuelles Angebot</div>
      <div style="font-size:13px;color:#bcbcbc;margin-top:8px;">{p["tagline"]}</div>
    </td>
    <td width="90" align="right" valign="top">{logo}</td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;background:#1b1b1b;border:1px solid #333333;border-radius:12px;"><tr><td style="padding:14px 18px;">
    <table width="100%"><tr>
      <td style="font-size:13px;line-height:22px;color:#bcbcbc;">
        <strong style="color:{p["accentColor"]};">Angebotsnummer:</strong> {{{{angebotsnummer}}}}<br>
        <strong style="color:{p["accentColor"]};">Datum:</strong> {{{{datum}}}}<br>
        <strong style="color:{p["accentColor"]};">Gültig bis:</strong> {{{{gueltig_bis}}}}
      </td>
      <td align="right" style="font-size:13px;line-height:22px;color:#bcbcbc;">
        <strong style="color:{p["accentColor"]};">Kunde:</strong><br>{{{{firma}}}}<br>{{{{strasse}}}}<br>{{{{ort}}}}
      </td>
    </tr></table>
  </td></tr></table>
</td></tr>'''

    if t == "intro":
        text_html = render_value(p["text"], data).replace("\n", "<br>")
        return f'<tr><td style="padding:16px 38px;background:{p["bgColor"]};font-size:14px;line-height:24px;color:{p["textColor"]};">{text_html}</td></tr>'

    if t == "position":
        rows = ""
        for pos in data.get("positions", []):
            img_url = extract_image_url(pos.get("bildUrl", ""))
            img_cell = f'<td width="190" align="right" valign="top"><img src="{img_url}" width="180" height="130" alt="Produktbild" style="display:block;border:0;border-radius:12px;object-fit:cover;"></td>' if p.get("showImage") and img_url else ""
            art_nr = f'<div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#8f8f8f;font-weight:bold;">Artikelnummer: {pos["artikelnummer"]}</div>' if p.get("showArticleNumber") else ""
            desc = f'<div style="font-size:14px;line-height:22px;color:#c9c9c9;margin-top:10px;">{pos["description"]}</div>' if p.get("showDescription") and pos.get("description") else ""
            rows += f'''<tr><td style="padding:14px 38px 0 38px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{p["bgColor"]};border:1px solid {p["borderColor"]};border-radius:14px;"><tr><td style="padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" style="padding-right:20px;">{art_nr}
        <div style="font-size:22px;line-height:28px;color:{p["accentColor"]};font-weight:bold;margin-top:6px;">{pos["name"]}</div>
        {desc}
        <div style="font-size:12px;color:#8f8f8f;margin-top:12px;">Preis zzgl. gesetzlicher MwSt.</div>
        <div style="font-size:26px;color:#ffffff;font-weight:bold;margin-top:2px;">{pos["preis"]}</div>
      </td>{img_cell}
    </tr></table>
  </td></tr></table>
</td></tr>'''
        return rows

    if t == "sum":
        return f'<tr><td style="padding:20px 38px 0 38px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{p["bgColor"]};border:1px solid {p["borderColor"]};border-radius:12px;"><tr><td style="padding:16px 20px;color:{p["accentColor"]};font-size:15px;font-weight:bold;">{p["label"]}</td><td align="right" style="padding:16px 20px;color:{p["accentColor"]};font-size:26px;font-weight:bold;">{{{{gesamtpreis}}}}</td></tr></table></td></tr>'

    if t == "notice":
        return f'<tr><td style="padding:12px 38px 0 38px;font-size:12px;line-height:20px;color:{p["textColor"]};background:{p["bgColor"]};">{p["text"]}</td></tr>'

    if t == "cta":
        return f'<tr><td align="center" style="padding:22px 38px 28px 38px;background:{p["bgColor"]};"><a href="mailto:?subject={render_value(p["mailSubject"],data)}" style="display:inline-block;background:{p["accentColor"]};color:#242424;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 26px;border-radius:999px;">{p["label"]}</a></td></tr>'

    if t == "footer":
        logo = f'<img src="{p["logoUrl"]}" width="80" alt="Logo" style="display:block;border:0;">' if p.get("logoUrl") else ''
        return f'''<tr><td style="padding:22px 38px 28px 38px;background:{p["bgColor"]};border-top:1px solid {p["borderColor"]};">
  <table width="100%"><tr>
    <td style="font-size:12px;line-height:20px;color:#9d9d9d;">
      <strong style="color:{p["accentColor"]};">{p["name"]}</strong><br>{p["company"]}<br>
      E-Mail: <a href="mailto:{p["email"]}" style="color:{p["accentColor"]};text-decoration:none;">{p["email"]}</a><br>
      Telefon: {p["phone"]}<br>
      Web: <a href="{p["web"]}" style="color:{p["accentColor"]};text-decoration:none;">{p["web"]}</a>
    </td>
    <td align="right" valign="top">{logo}</td>
  </tr></table>
</td></tr>'''

    if t == "divider":
        return f'<tr><td style="padding:{p["margin"]}px 38px;background:#242424;"><div style="border-top:1px solid {p["color"]};font-size:0;">&nbsp;</div></td></tr>'

    return ""

def render_template(blocks: list, data: dict) -> str:
    rows = "".join(render_block(b, data) for b in blocks)
    html = f'''<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>Angebot {data.get("angebotsnummer","")}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;padding:30px 0;">
<tr><td align="center">
<table width="660" cellpadding="0" cellspacing="0" border="0" style="width:660px;max-width:660px;background:#242424;border-radius:18px;overflow:hidden;">
<tr><td style="height:6px;background:#fce499;font-size:0;">&nbsp;</td></tr>
{rows}
</table></td></tr></table>
</body></html>'''
    return render_value(html, data)
