from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True)
    email      = Column(String, unique=True, nullable=False)
    name       = Column(String)
    password   = Column(String, nullable=False)
    is_admin   = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class Signature(Base):
    __tablename__ = "signatures"
    id            = Column(Integer, primary_key=True)
    name          = Column(String, nullable=False)
    html_content  = Column(Text, default="")
    text_content  = Column(Text, default="")
    is_default    = Column(Boolean, default=False)
    designer_json = Column(Text, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

class Template(Base):
    __tablename__ = "templates"
    id           = Column(Integer, primary_key=True)
    name         = Column(String, nullable=False)
    description  = Column(String, default="")
    blocks_json  = Column(Text, default="[]")
    is_default   = Column(Boolean, default=False)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, onupdate=func.now())

class CIConfig(Base):
    __tablename__ = "ci_configs"
    id             = Column(Integer, primary_key=True)
    name           = Column(String, nullable=False)
    primary_color  = Column(String, default="#fce499")
    text_color     = Column(String, default="#333333")
    bg_color       = Column(String, default="#ffffff")
    header_bg      = Column(String, default="#242424")
    font_family    = Column(String, default="Arial, Helvetica, sans-serif")
    font_size      = Column(String, default="14px")
    line_height    = Column(String, default="1.6")
    container_width= Column(String, default="620")
    logo_url       = Column(String, default="")
    company_name   = Column(String, default="")
    show_header    = Column(Boolean, default=True)
    show_footer    = Column(Boolean, default=True)
    footer_text    = Column(Text, default="")
    content_bg     = Column(String, default="#ffffff")
    border         = Column(String, default="1px solid #dddddd")
    created_at     = Column(DateTime, server_default=func.now())

class Disclaimer(Base):
    __tablename__ = "disclaimers"
    id           = Column(Integer, primary_key=True)
    name         = Column(String, nullable=False)
    html_content = Column(Text, default="")
    text_content = Column(Text, default="")
    created_at   = Column(DateTime, server_default=func.now())

class Banner(Base):
    __tablename__ = "banners"
    id         = Column(Integer, primary_key=True)
    name       = Column(String, nullable=False)
    props_json = Column(Text, default="{}")
    created_at = Column(DateTime, server_default=func.now())

class SMTPAccount(Base):
    __tablename__ = "smtp_accounts"
    id           = Column(Integer, primary_key=True)
    name         = Column(String, nullable=False)
    relay_host   = Column(String, default="")
    relay_port   = Column(Integer, default=587)
    relay_user   = Column(String, default="")
    relay_pass   = Column(String, default="")
    from_address = Column(String, default="")
    match_domain = Column(String, default="")
    is_default   = Column(Boolean, default=False)
    created_at   = Column(DateTime, server_default=func.now())

class Rule(Base):
    __tablename__ = "rules"
    id                = Column(Integer, primary_key=True)
    name              = Column(String, nullable=False)
    match_sender      = Column(String, nullable=True)
    match_domain      = Column(String, nullable=True)
    apply_on_new      = Column(Boolean, default=True)
    apply_on_reply    = Column(Boolean, default=False)
    signature_id      = Column(Integer, ForeignKey("signatures.id"), nullable=True)
    template_id       = Column(Integer, ForeignKey("templates.id"), nullable=True)
    ci_config_id      = Column(Integer, ForeignKey("ci_configs.id"), nullable=True)
    smtp_account_id   = Column(Integer, ForeignKey("smtp_accounts.id"), nullable=True)
    disclaimer_id     = Column(Integer, ForeignKey("disclaimers.id"), nullable=True)
    enrichment_source      = Column(String, nullable=True)
    priority               = Column(Integer, default=100)
    is_active              = Column(Boolean, default=True)
    recipient_scope        = Column(String, default="all")   # all | external_only | internal_only
    match_recipient        = Column(String, nullable=True)   # specific recipient email
    match_recipient_domain = Column(String, nullable=True)   # recipient domain
    time_from              = Column(String, nullable=True)   # "HH:MM"
    time_until             = Column(String, nullable=True)   # "HH:MM"
    days_of_week           = Column(String, nullable=True)   # "0,1,2,3,4" (0=Mon, 6=Sun)
    forward_to             = Column(String, nullable=True)   # comma-separated email addresses

class SenderProfile(Base):
    __tablename__ = "sender_profiles"
    id                 = Column(Integer, primary_key=True)
    email              = Column(String, unique=True, nullable=False)
    first_name         = Column(String, default="")
    last_name          = Column(String, default="")
    job_title          = Column(String, default="")
    photo_url          = Column(String, default="")
    phone              = Column(String, default="")
    mobile             = Column(String, default="")
    street             = Column(String, default="")
    postal_code        = Column(String, default="")
    city               = Column(String, default="")
    country            = Column(String, default="")
    company            = Column(String, default="")
    claimed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, onupdate=func.now())

class Setting(Base):
    __tablename__ = "settings"
    key   = Column(String, primary_key=True)
    value = Column(Text)

class SMTPUser(Base):
    __tablename__ = "smtp_users"
    id         = Column(Integer, primary_key=True)
    username   = Column(String, unique=True, nullable=False)
    password   = Column(String, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class ImageAsset(Base):
    __tablename__ = "image_assets"
    id                = Column(Integer, primary_key=True)
    name              = Column(String, nullable=False)
    original_filename = Column(String, default="")
    mime_type         = Column(String, default="image/jpeg")
    data              = Column(LargeBinary, nullable=False)
    thumb_data        = Column(LargeBinary, nullable=True)
    width             = Column(Integer, default=0)
    height            = Column(Integer, default=0)
    file_size         = Column(Integer, default=0)
    created_at        = Column(DateTime, server_default=func.now())

class Campaign(Base):
    __tablename__ = "campaigns"
    id               = Column(Integer, primary_key=True)
    name             = Column(String, nullable=False)
    is_active        = Column(Boolean, default=True)
    start_date       = Column(DateTime, nullable=True)   # null = sofort aktiv
    end_date         = Column(DateTime, nullable=True)   # null = kein Ende
    image_asset_id   = Column(Integer, ForeignKey("image_assets.id"), nullable=True)
    link_url         = Column(String, default="")
    utm_source       = Column(String, default="email")
    utm_medium       = Column(String, default="email")
    utm_campaign     = Column(String, default="")
    utm_content      = Column(String, default="")
    click_count      = Column(Integer, default=0)
    impression_count = Column(Integer, default=0)
    created_at       = Column(DateTime, server_default=func.now())

class LogEntry(Base):
    __tablename__ = "logs"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, index=True)
    level     = Column(String, index=True)
    service   = Column(String, index=True)
    message   = Column(Text)
    details   = Column(Text)

class MailQueueEntry(Base):
    __tablename__ = "mail_queue"
    id                = Column(Integer, primary_key=True)
    created_at        = Column(DateTime, server_default=func.now(), index=True)
    last_attempt_at   = Column(DateTime, nullable=True)
    next_attempt_at   = Column(DateTime, nullable=True)
    attempts          = Column(Integer, default=0)
    max_attempts      = Column(Integer, default=5)
    status            = Column(String, default="pending", index=True)  # pending|sent|failed
    sender            = Column(String, default="")
    recipients        = Column(Text, default="")
    subject           = Column(String, default="")
    message_b64       = Column(Text, nullable=False)
    smtp_account_json = Column(Text, default="")
    rcpt_tos_json     = Column(Text, default="")   # JSON list of envelope RCPT TO addresses
    last_error        = Column(Text, default="")

class SenderSlot(Base):
    __tablename__ = "sender_slots"
    id         = Column(Integer, primary_key=True)
    email      = Column(String, unique=True, nullable=False, index=True)
    first_seen = Column(DateTime, server_default=func.now())
    last_seen  = Column(DateTime, server_default=func.now())
    mail_count = Column(Integer, default=1)

class MailLog(Base):
    __tablename__ = "mail_logs"
    id             = Column(Integer, primary_key=True)
    timestamp      = Column(DateTime, server_default=func.now(), index=True)
    sender         = Column(String, default="", index=True)
    recipients     = Column(Text, default="")    # comma-separated
    subject        = Column(String, default="")
    rule_id        = Column(Integer, nullable=True)
    rule_name      = Column(String, default="")
    signature_name = Column(String, default="")
    action         = Column(String, default="signed", index=True)  # signed|no_rule|error
    relay_ok       = Column(Boolean, default=True)
    relay_error    = Column(String, default="")
    duration_ms    = Column(Integer, default=0)
    message_size   = Column(Integer, default=0)
