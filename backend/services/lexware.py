import httpx, logging

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
