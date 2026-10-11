//! SQLite-Zugriff. Das Schema ist identisch zu backend/models.py, damit eine
//! bestehende signaturmonster.db aus der Docker-Installation weiterverwendet
//! werden kann. Zugriffe laufen synchron hinter einem Mutex – bei einem
//! einzigen Runtime-Thread gibt es ohnehin keine parallelen Queries.

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Serialize;

pub struct Db {
    conn: Mutex<Connection>,
}

/// Tabellen, die der PoC benötigt – nur relevant für eine frische Datenbank.
const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, email VARCHAR NOT NULL UNIQUE, name VARCHAR,
    password VARCHAR NOT NULL, is_admin BOOLEAN, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP));
CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, html_content TEXT, text_content TEXT,
    is_default BOOLEAN, designer_json TEXT, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP));
CREATE TABLE IF NOT EXISTS disclaimers (
    id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, html_content TEXT, text_content TEXT,
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP));
CREATE TABLE IF NOT EXISTS smtp_accounts (
    id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, relay_host VARCHAR, relay_port INTEGER,
    relay_user VARCHAR, relay_pass VARCHAR, from_address VARCHAR, match_domain VARCHAR,
    is_default BOOLEAN, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP));
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, match_sender VARCHAR, match_domain VARCHAR,
    apply_on_new BOOLEAN, apply_on_reply BOOLEAN, signature_id INTEGER, template_id INTEGER,
    ci_config_id INTEGER, smtp_account_id INTEGER, disclaimer_id INTEGER, enrichment_source VARCHAR,
    priority INTEGER, is_active BOOLEAN, recipient_scope VARCHAR, match_recipient VARCHAR,
    match_recipient_domain VARCHAR, time_from VARCHAR, time_until VARCHAR, days_of_week VARCHAR,
    forward_to VARCHAR);
CREATE TABLE IF NOT EXISTS sender_profiles (
    id INTEGER PRIMARY KEY, email VARCHAR NOT NULL UNIQUE, first_name VARCHAR, last_name VARCHAR,
    job_title VARCHAR, photo_url VARCHAR, phone VARCHAR, mobile VARCHAR, street VARCHAR,
    postal_code VARCHAR, city VARCHAR, country VARCHAR, company VARCHAR, claimed_by_user_id INTEGER,
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), updated_at DATETIME);
CREATE TABLE IF NOT EXISTS settings (key VARCHAR PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS smtp_users (
    id INTEGER PRIMARY KEY, username VARCHAR NOT NULL UNIQUE, password VARCHAR NOT NULL,
    is_active BOOLEAN, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP));
CREATE TABLE IF NOT EXISTS mail_logs (
    id INTEGER PRIMARY KEY, timestamp DATETIME DEFAULT (CURRENT_TIMESTAMP), sender VARCHAR,
    recipients TEXT, subject VARCHAR, rule_id INTEGER, rule_name VARCHAR, signature_name VARCHAR,
    action VARCHAR, relay_ok BOOLEAN, relay_error VARCHAR, duration_ms INTEGER,
    message_size INTEGER, message_b64 TEXT);
"#;

#[derive(Clone, Debug)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub is_admin: bool,
    pub password_hash: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Signature {
    pub id: i64,
    pub name: String,
    pub html_content: String,
    pub text_content: String,
    pub is_default: bool,
    pub designer_json: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Disclaimer {
    pub html_content: String,
    pub text_content: String,
}

#[derive(Clone, Debug)]
pub struct SmtpAccount {
    pub name: String,
    pub relay_host: String,
    pub relay_port: u16,
    pub relay_user: String,
    pub relay_pass: String,
}

#[derive(Clone, Debug, Default)]
pub struct SenderProfile {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub job_title: String,
    pub photo_url: String,
    pub phone: String,
    pub mobile: String,
    pub street: String,
    pub postal_code: String,
    pub city: String,
    pub country: String,
    pub company: String,
}

#[derive(Clone, Debug)]
pub struct Rule {
    pub id: i64,
    pub match_sender: Option<String>,
    pub match_domain: Option<String>,
    pub apply_on_new: bool,
    pub apply_on_reply: bool,
    pub signature_id: Option<i64>,
    pub smtp_account_id: Option<i64>,
    pub disclaimer_id: Option<i64>,
    pub recipient_scope: Option<String>,
    pub match_recipient: Option<String>,
    pub match_recipient_domain: Option<String>,
    pub time_from: Option<String>,
    pub time_until: Option<String>,
    pub days_of_week: Option<String>,
    pub forward_to: Option<String>,
}

pub struct MailLogEntry<'a> {
    pub sender: &'a str,
    pub recipients: &'a str,
    pub subject: &'a str,
    pub rule_id: Option<i64>,
    pub rule_name: &'a str,
    pub action: &'a str,
    pub relay_ok: bool,
    pub relay_error: &'a str,
    pub duration_ms: i64,
    pub message: &'a [u8],
}

/// NULL-tolerantes Lesen von Text- und Bool-Spalten (SQLAlchemy-Defaults
/// greifen nur beim Insert über das ORM, ältere Zeilen können NULL enthalten).
fn text(row: &Row, idx: usize) -> rusqlite::Result<String> {
    Ok(row.get::<_, Option<String>>(idx)?.unwrap_or_default())
}
fn flag(row: &Row, idx: usize, default: bool) -> rusqlite::Result<bool> {
    Ok(row.get::<_, Option<bool>>(idx)?.unwrap_or(default))
}

const ACCOUNT_COLS: &str = "name, relay_host, relay_port, relay_user, relay_pass";
fn account(row: &Row) -> rusqlite::Result<SmtpAccount> {
    Ok(SmtpAccount {
        name: text(row, 0)?,
        relay_host: text(row, 1)?,
        relay_port: row.get::<_, Option<i64>>(2)?.unwrap_or(587) as u16,
        relay_user: text(row, 3)?,
        relay_pass: text(row, 4)?,
    })
}

impl Db {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.busy_timeout(Duration::from_secs(5))?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(SCHEMA)?;
        let users: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
        if users == 0 {
            // Gleicher Erst-Login wie das Python-Backend (main.py startup)
            let hash = bcrypt::hash("monster", 12)?;
            conn.execute(
                "INSERT INTO users (name, email, password, is_admin) VALUES ('monster', 'monster@local', ?1, 1)",
                [hash],
            )?;
            tracing::warn!("Erster Start: Admin-Benutzer 'monster' / Passwort 'monster' angelegt – bitte ändern");
        }
        Ok(())
    }

    fn user_where(&self, clause: &str, param: &dyn rusqlite::ToSql) -> Result<Option<User>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!("SELECT id, name, is_admin, password FROM users WHERE {clause}");
        Ok(conn
            .query_row(&sql, [param], |r| {
                Ok(User { id: r.get(0)?, name: text(r, 1)?, is_admin: flag(r, 2, false)?, password_hash: text(r, 3)? })
            })
            .optional()?)
    }

    pub fn user_by_name(&self, name: &str) -> Result<Option<User>> {
        self.user_where("name = ?1", &name)
    }

    pub fn user_by_id(&self, id: i64) -> Result<Option<User>> {
        self.user_where("id = ?1", &id)
    }

    pub fn smtp_user_hash(&self, username: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        Ok(conn
            .query_row(
                "SELECT password FROM smtp_users WHERE username = ?1 AND is_active = 1",
                [username],
                |r| r.get(0),
            )
            .optional()?)
    }

    pub fn setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        Ok(conn
            .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get::<_, Option<String>>(0))
            .optional()?
            .flatten())
    }

    fn signatures_where(&self, clause: &str, param: Option<i64>) -> Result<Vec<Signature>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT id, name, html_content, text_content, is_default, designer_json FROM signatures {clause}"
        );
        let mut stmt = conn.prepare(&sql)?;
        let map = |r: &Row| {
            Ok(Signature {
                id: r.get(0)?,
                name: text(r, 1)?,
                html_content: text(r, 2)?,
                text_content: text(r, 3)?,
                is_default: flag(r, 4, false)?,
                designer_json: r.get(5)?,
            })
        };
        let rows = match param {
            Some(p) => stmt.query_map([p], map)?.collect::<rusqlite::Result<Vec<_>>>()?,
            None => stmt.query_map([], map)?.collect::<rusqlite::Result<Vec<_>>>()?,
        };
        Ok(rows)
    }

    pub fn signatures(&self) -> Result<Vec<Signature>> {
        self.signatures_where("", None)
    }

    pub fn signature(&self, id: i64) -> Result<Option<Signature>> {
        Ok(self.signatures_where("WHERE id = ?1", Some(id))?.into_iter().next())
    }

    pub fn disclaimer(&self, id: i64) -> Result<Option<Disclaimer>> {
        let conn = self.conn.lock().unwrap();
        Ok(conn
            .query_row("SELECT html_content, text_content FROM disclaimers WHERE id = ?1", [id], |r| {
                Ok(Disclaimer { html_content: text(r, 0)?, text_content: text(r, 1)? })
            })
            .optional()?)
    }

    pub fn smtp_account(&self, id: i64) -> Result<Option<SmtpAccount>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!("SELECT {ACCOUNT_COLS} FROM smtp_accounts WHERE id = ?1");
        Ok(conn.query_row(&sql, [id], account).optional()?)
    }

    /// Wie GET /api/smtp-accounts/by-domain: exakter Domain-Match,
    /// sonst Default-Konto, sonst erstes Konto.
    pub fn smtp_account_for_domain(&self, domain: &str) -> Result<Option<SmtpAccount>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT {ACCOUNT_COLS} FROM smtp_accounts
             ORDER BY (lower(match_domain) = ?1) DESC, (is_default = 1) DESC, id LIMIT 1"
        );
        Ok(conn.query_row(&sql, [domain.to_lowercase()], account).optional()?)
    }

    pub fn sender_profile(&self, email: &str) -> Result<Option<SenderProfile>> {
        let conn = self.conn.lock().unwrap();
        Ok(conn
            .query_row(
                "SELECT email, first_name, last_name, job_title, photo_url, phone, mobile,
                        street, postal_code, city, country, company
                 FROM sender_profiles WHERE lower(email) = lower(?1)",
                [email],
                |r| {
                    Ok(SenderProfile {
                        email: text(r, 0)?,
                        first_name: text(r, 1)?,
                        last_name: text(r, 2)?,
                        job_title: text(r, 3)?,
                        photo_url: text(r, 4)?,
                        phone: text(r, 5)?,
                        mobile: text(r, 6)?,
                        street: text(r, 7)?,
                        postal_code: text(r, 8)?,
                        city: text(r, 9)?,
                        country: text(r, 10)?,
                        company: text(r, 11)?,
                    })
                },
            )
            .optional()?)
    }

    pub fn active_rules(&self) -> Result<Vec<Rule>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, match_sender, match_domain, apply_on_new, apply_on_reply, signature_id,
                    smtp_account_id, disclaimer_id, recipient_scope, match_recipient,
                    match_recipient_domain, time_from, time_until, days_of_week, forward_to
             FROM rules WHERE is_active = 1 ORDER BY priority",
        )?;
        let rows = stmt
            .query_map([], |r| {
                Ok(Rule {
                    id: r.get(0)?,
                    match_sender: r.get(1)?,
                    match_domain: r.get(2)?,
                    apply_on_new: flag(r, 3, true)?,
                    apply_on_reply: flag(r, 4, false)?,
                    signature_id: r.get(5)?,
                    smtp_account_id: r.get(6)?,
                    disclaimer_id: r.get(7)?,
                    recipient_scope: r.get(8)?,
                    match_recipient: r.get(9)?,
                    match_recipient_domain: r.get(10)?,
                    time_from: r.get(11)?,
                    time_until: r.get(12)?,
                    days_of_week: r.get(13)?,
                    forward_to: r.get(14)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn insert_mail_log(&self, e: &MailLogEntry) -> Result<()> {
        use base64::Engine;
        let archive = self.setting("mail_archive_enabled")?.as_deref() == Some("true");
        let message_b64 = archive.then(|| base64::engine::general_purpose::STANDARD.encode(e.message));
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO mail_logs (timestamp, sender, recipients, subject, rule_id, rule_name,
                 signature_name, action, relay_ok, relay_error, duration_ms, message_size, message_b64)
             VALUES (CURRENT_TIMESTAMP, ?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                e.sender,
                e.recipients,
                e.subject,
                e.rule_id,
                e.rule_name,
                e.action,
                e.relay_ok,
                e.relay_error,
                e.duration_ms,
                e.message.len() as i64,
                message_b64
            ],
        )?;
        Ok(())
    }
}
