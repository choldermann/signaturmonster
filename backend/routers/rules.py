from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Rule, Signature, CIConfig, SMTPAccount, Disclaimer, Setting
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class RuleMatchRequest(BaseModel):
    sender: str
    domain: str
    is_reply: bool
    recipients: list[str] = []

class RuleCreate(BaseModel):
    name: str
    match_sender: Optional[str] = None
    match_domain: Optional[str] = None
    apply_on_new: bool = True
    apply_on_reply: bool = False
    signature_id: Optional[int] = None
    template_id: Optional[int] = None
    ci_config_id: Optional[int] = None
    smtp_account_id: Optional[int] = None
    disclaimer_id: Optional[int] = None
    enrichment_source: Optional[str] = None
    priority: int = 100
    is_active: bool = True
    recipient_scope: str = "all"

def _recipient_domains(recipients: list[str]) -> set[str]:
    domains = set()
    for r in recipients:
        addr = r.strip().lower()
        if "<" in addr and ">" in addr:
            addr = addr.split("<")[1].split(">")[0].strip()
        if "@" in addr:
            domains.add(addr.split("@")[-1])
    return domains

@router.post("/match")
async def match_rule(req: RuleMatchRequest, db: AsyncSession = Depends(get_db)):
    # Load internal domains from settings (comma-separated)
    int_setting = await db.get(Setting, "internal_domains")
    internal_domains = set()
    if int_setting and int_setting.value:
        internal_domains = {d.strip().lower() for d in int_setting.value.split(",") if d.strip()}

    recipient_domains = _recipient_domains(req.recipients)

    result = await db.execute(
        select(Rule).where(Rule.is_active == True).order_by(Rule.priority)
    )
    for rule in result.scalars().all():
        if req.is_reply and not rule.apply_on_reply:
            continue
        if not req.is_reply and not rule.apply_on_new:
            continue
        match = (
            (rule.match_sender and rule.match_sender.lower() == req.sender) or
            (rule.match_domain and rule.match_domain.lower() == req.domain) or
            (not rule.match_sender and not rule.match_domain)
        )
        if not match:
            continue

        # Recipient scope filtering (only when internal_domains are configured)
        scope = getattr(rule, "recipient_scope", "all") or "all"
        if scope != "all" and internal_domains and recipient_domains:
            all_internal = recipient_domains.issubset(internal_domains)
            any_external = not recipient_domains.issubset(internal_domains)
            if scope == "external_only" and not any_external:
                continue
            if scope == "internal_only" and not all_internal:
                continue

        sig = await db.get(Signature, rule.signature_id) if rule.signature_id else None
        if not sig:
            continue

        # CI-Config laden falls vorhanden
        ci_dict = None
        if rule.ci_config_id:
            ci = await db.get(CIConfig, rule.ci_config_id)
            if ci:
                ci_dict = {
                    "primary_color":   ci.primary_color,
                    "text_color":      ci.text_color,
                    "bg_color":        ci.bg_color,
                    "header_bg":       ci.header_bg,
                    "font_family":     ci.font_family,
                    "font_size":       ci.font_size,
                    "line_height":     ci.line_height,
                    "container_width": ci.container_width,
                    "logo_url":        ci.logo_url,
                    "company_name":    ci.company_name,
                    "show_header":     ci.show_header,
                    "show_footer":     ci.show_footer,
                    "footer_text":     ci.footer_text,
                    "content_bg":      ci.content_bg,
                    "border":          ci.border,
                }

        smtp_account_dict = None
        if rule.smtp_account_id:
            smtp_acc = await db.get(SMTPAccount, rule.smtp_account_id)
            if smtp_acc:
                smtp_account_dict = {
                    "id":           smtp_acc.id,
                    "relay_host":   smtp_acc.relay_host,
                    "relay_port":   smtp_acc.relay_port,
                    "relay_user":   smtp_acc.relay_user,
                    "relay_pass":   smtp_acc.relay_pass,
                    "from_address": smtp_acc.from_address,
                }

        disclaimer_dict = None
        if rule.disclaimer_id:
            disclaimer = await db.get(Disclaimer, rule.disclaimer_id)
            if disclaimer:
                disclaimer_dict = {
                    "id":           disclaimer.id,
                    "name":         disclaimer.name,
                    "html_content": disclaimer.html_content,
                    "text_content": disclaimer.text_content,
                }

        pb_setting = await db.get(Setting, "powered_by_enabled")
        powered_by = pb_setting is None or pb_setting.value != "false"

        return {
            "rule_id": rule.id,
            "signature": {
                "id": sig.id, "name": sig.name,
                "html_content": sig.html_content,
                "text_content": sig.text_content,
            },
            "template_id":       rule.template_id,
            "enrichment_source": rule.enrichment_source,
            "ci_config":         ci_dict,
            "smtp_account":      smtp_account_dict,
            "disclaimer":        disclaimer_dict,
            "powered_by":        powered_by,
        }
    return None

@router.get("/")
async def list_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rule).order_by(Rule.priority))
    return result.scalars().all()

@router.get("/{rule_id}")
async def get_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(Rule, rule_id)
    if not rule: raise HTTPException(404, "Not found")
    return rule

@router.post("/")
async def create_rule(data: RuleCreate, db: AsyncSession = Depends(get_db)):
    rule = Rule(**data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.put("/{rule_id}")
async def update_rule(rule_id: int, data: RuleCreate, db: AsyncSession = Depends(get_db)):
    rule = await db.get(Rule, rule_id)
    if not rule: raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/{rule_id}")
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(Rule, rule_id)
    if not rule: raise HTTPException(404, "Not found")
    await db.delete(rule)
    await db.commit()
    return {"ok": True}
