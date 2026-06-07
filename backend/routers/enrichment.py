from fastapi import APIRouter
from pydantic import BaseModel
from services.lexware import LexwareService
import os

router = APIRouter()
lexware = LexwareService(api_token=os.getenv("LEXWARE_API_TOKEN", ""))

class EnrichmentRequest(BaseModel):
    message_subject: str

@router.post("/lexware")
async def enrich_from_lexware(req: EnrichmentRequest):
    data = await lexware.find_document_by_subject(req.message_subject)
    return data or {}
