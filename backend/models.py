from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
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
    enrichment_source = Column(String, nullable=True)
    priority          = Column(Integer, default=100)
    is_active         = Column(Boolean, default=True)

class SenderProfile(Base):
    __tablename__ = "sender_profiles"
    id          = Column(Integer, primary_key=True)
    email       = Column(String, unique=True, nullable=False)
    first_name  = Column(String, default="")
    last_name   = Column(String, default="")
    job_title   = Column(String, default="")
    photo_url   = Column(String, default="")
    phone       = Column(String, default="")
    mobile      = Column(String, default="")
    street      = Column(String, default="")
    postal_code = Column(String, default="")
    city        = Column(String, default="")
    country     = Column(String, default="")
    company     = Column(String, default="")
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, onupdate=func.now())

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

class LogEntry(Base):
    __tablename__ = "logs"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, index=True)
    level     = Column(String, index=True)
    service   = Column(String, index=True)
    message   = Column(Text)
    details   = Column(Text)
