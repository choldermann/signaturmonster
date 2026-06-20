import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
LEXWARE_BASE = "https://api.lexoffice.io/v1"

class LexwareService:
    def __init__(self, api_token: str):
        self.token = api_token
        self.headers = {"Authorization": f"Bearer {api_token}", "Accept": "application/json"}

    async def find_document_by_subject(self, subject: str) -> dict | None:
        if not self.token:
            return None
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{LEXWARE_BASE}/quotations",
                    headers=self.headers,
                    params={"voucherStatus": "open"},
                    timeout=5,
                )
                if resp.status_code == 200:
                    for doc in resp.json().get("content", []):
                        if doc.get("voucherNumber", "") in subject:
                            return self._flatten(doc)
        except Exception as e:
            logger.error(f"Lexware API error: {e}")
        return None

    async def get_quotation_detail_by_number(self, number: str) -> dict | None:
        """Sucht Angebot per Vouchernnummer, holt dann vollständiges Detail inkl. Positionen."""
        if not self.token:
            return None
        try:
            async with httpx.AsyncClient() as client:
                for status in ["open", "accepted", "draft"]:
                    resp = await client.get(
                        f"{LEXWARE_BASE}/quotations",
                        headers=self.headers,
                        params={"voucherStatus": status, "size": 250},
                        timeout=8,
                    )
                    if resp.status_code != 200:
                        continue
                    for doc in resp.json().get("content", []):
                        if doc.get("voucherNumber", "") == number:
                            doc_id = doc.get("id")
                            if not doc_id:
                                return self.to_template_data(doc)
                            detail_resp = await client.get(
                                f"{LEXWARE_BASE}/quotations/{doc_id}",
                                headers=self.headers,
                                timeout=5,
                            )
                            if detail_resp.status_code == 200:
                                return self.to_template_data(detail_resp.json())
        except Exception as e:
            logger.error(f"Lexware get_quotation_detail_by_number error: {e}")
        return None

    def to_template_data(self, detail: dict) -> dict:
        """Mappt Lexoffice-Detail-Dict auf Template-Variablen."""
        addr  = detail.get("address", {})
        total = detail.get("totalPrice", {})

        def fmt_date(s: str) -> str:
            if not s:
                return ""
            try:
                return datetime.fromisoformat(s[:10]).strftime("%d.%m.%Y")
            except Exception:
                return s[:10]

        def fmt_amount(v) -> str:
            if v is None:
                return ""
            try:
                formatted = f"{float(v):,.2f}"
                # 1,234.56 → 1.234,56
                formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
                return f"{formatted} €"
            except Exception:
                return str(v)

        positions = []
        for item in detail.get("lineItems", []):
            if item.get("type") not in ("custom", "service", "material", "text"):
                continue
            if item.get("type") == "text":
                continue
            positions.append({
                "artikelnummer": "",
                "name":          item.get("name", ""),
                "description":   item.get("description", ""),
                "preis":         fmt_amount(item.get("lineItemAmount")),
                "bildUrl":       "",
            })

        return {
            "angebotsnummer": detail.get("voucherNumber", ""),
            "datum":          fmt_date(detail.get("voucherDate", "")),
            "gueltig_bis":    fmt_date(detail.get("expirationDate", "")),
            "firma":          addr.get("name", ""),
            "strasse":        addr.get("street", ""),
            "ort":            f"{addr.get('zip', '')} {addr.get('city', '')}".strip(),
            "anrede":         "",
            "nachname":       addr.get("name", ""),
            "gesamtpreis":    fmt_amount(total.get("totalNetAmount")),
            "positions":      positions,
        }

    def _flatten(self, doc: dict) -> dict:
        addr = doc.get("address", {})
        return {
            "angebot_nummer": doc.get("voucherNumber", ""),
            "angebot_datum":  doc.get("voucherDate", "")[:10] if doc.get("voucherDate") else "",
            "kunde_name":     addr.get("name", ""),
            "kunde_strasse":  addr.get("street", ""),
            "kunde_ort":      f"{addr.get('zip','')} {addr.get('city','')}".strip(),
            "betrag_netto":   str(doc.get("totalPrice", {}).get("totalNetAmount", "")),
            "betrag_brutto":  str(doc.get("totalPrice", {}).get("totalGrossAmount", "")),
            "waehrung":       doc.get("currency", "EUR"),
        }
