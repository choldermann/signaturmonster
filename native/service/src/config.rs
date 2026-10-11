use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;

use anyhow::{Context, Result};

pub struct Config {
    pub data_dir: PathBuf,
    pub http_addr: SocketAddr,
    pub smtp_addr: SocketAddr,
    pub smtp_require_tls: bool,
    pub hostname: String,
    pub max_message_size: usize,
    pub rate_limit_per_minute: usize,
    /// Fallback-Relay, wenn kein SMTP-Konto in der DB passt (wie RELAY_* in Docker).
    pub relay_fallback: Option<crate::db::SmtpAccount>,
}

/// Standard-Datenverzeichnis je Betriebssystem (für den Systemdienst).
fn default_data_dir() -> PathBuf {
    if cfg!(windows) {
        let base = std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".into());
        PathBuf::from(base).join("Signaturmonster")
    } else if cfg!(target_os = "macos") {
        PathBuf::from("/Library/Application Support/Signaturmonster")
    } else {
        PathBuf::from("/var/lib/signaturmonster")
    }
}

/// Liest KEY=VALUE-Zeilen; Umgebungsvariablen haben Vorrang.
fn read_conf_file(path: &std::path::Path) -> HashMap<String, String> {
    let Ok(text) = std::fs::read_to_string(path) else { return HashMap::new() };
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .filter_map(|l| l.split_once('='))
        .map(|(k, v)| (k.trim().to_string(), v.trim().trim_matches('"').to_string()))
        .collect()
}

impl Config {
    pub fn load() -> Result<Self> {
        let data_dir = std::env::var("SM_DATA_DIR").map(PathBuf::from).unwrap_or_else(|_| default_data_dir());
        let file = read_conf_file(&data_dir.join("signaturmonster.conf"));
        let get = |key: &str| std::env::var(key).ok().or_else(|| file.get(key).cloned());
        let num = |key: &str, default: u64| -> Result<u64> {
            get(key).map(|v| v.parse().with_context(|| format!("{key} ist keine Zahl"))).unwrap_or(Ok(default))
        };

        let bind: IpAddr = get("SM_BIND").unwrap_or_else(|| "0.0.0.0".into()).parse().context("SM_BIND")?;
        let relay_fallback = get("SM_RELAY_HOST").filter(|h| !h.is_empty()).map(|host| crate::db::SmtpAccount {
            name: "Fallback (Konfiguration)".into(),
            relay_host: host,
            relay_port: num("SM_RELAY_PORT", 587).unwrap_or(587) as u16,
            relay_user: get("SM_RELAY_USER").unwrap_or_default(),
            relay_pass: get("SM_RELAY_PASS").unwrap_or_default(),
        });

        Ok(Self {
            http_addr: SocketAddr::new(bind, num("SM_HTTP_PORT", 8080)? as u16),
            smtp_addr: SocketAddr::new(bind, num("SM_SMTP_PORT", 587)? as u16),
            smtp_require_tls: get("SM_SMTP_REQUIRE_TLS").map(|v| v != "false").unwrap_or(true),
            hostname: get("SM_HOSTNAME").unwrap_or_else(|| "signaturmonster.local".into()),
            max_message_size: num("SM_MAX_MESSAGE_MB", 50)? as usize * 1024 * 1024,
            rate_limit_per_minute: num("SM_RATE_LIMIT_PER_MINUTE", 30)? as usize,
            relay_fallback,
            data_dir,
        })
    }
}
