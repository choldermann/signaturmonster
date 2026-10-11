//! Signaturmonster Native Service (Proof of Concept)
//!
//! Eine einzige Binary ersetzt die Container sm-smtp, sm-backend und sm-nginx:
//! SMTP-Proxy, REST-API und das eingebettete React-Frontend laufen in einem
//! Prozess auf einem einzigen Thread (tokio current_thread runtime).

mod api;
mod config;
mod db;
mod mail;
mod relay;
mod rules;
mod service;
mod smtp;
mod tls;

use std::collections::{HashMap, VecDeque};
use std::net::IpAddr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::Result;
use tracing::info;

use config::Config;

pub struct AppState {
    pub cfg: Config,
    pub db: db::Db,
    pub jwt_secret: Vec<u8>,
    rate: Mutex<HashMap<IpAddr, VecDeque<Instant>>>,
}

impl AppState {
    /// Sliding-Window-Rate-Limit pro Client-IP (wie rate_limiter.py).
    pub fn rate_ok(&self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let mut map = self.rate.lock().unwrap();
        let q = map.entry(ip).or_default();
        while q.front().is_some_and(|t| now.duration_since(*t) > Duration::from_secs(60)) {
            q.pop_front();
        }
        if q.len() >= self.cfg.rate_limit_per_minute {
            return false;
        }
        q.push_back(now);
        true
    }
}

const HELP: &str = "\
Signaturmonster Service

Verwendung: signaturmonster-service <befehl>

  run         Im Vordergrund starten (Standard)
  install     Als Systemdienst installieren (Admin/root erforderlich)
  uninstall   Systemdienst entfernen
  start       Systemdienst starten
  stop        Systemdienst stoppen
  version     Version anzeigen

Konfiguration über Umgebungsvariablen oder <datenverzeichnis>/signaturmonster.conf:
  SM_DATA_DIR, SM_BIND, SM_HTTP_PORT, SM_SMTP_PORT, SM_SMTP_REQUIRE_TLS,
  SM_RELAY_HOST, SM_RELAY_PORT, SM_RELAY_USER, SM_RELAY_PASS
";

fn main() -> Result<()> {
    let cmd = std::env::args().nth(1).unwrap_or_else(|| "run".into());
    match cmd.as_str() {
        "run" => {
            let cfg = Config::load()?;
            init_logging(None);
            run_blocking(cfg, None)
        }
        "install" | "uninstall" | "start" | "stop" => service::manage(&cmd),
        #[cfg(windows)]
        "service" => service::windows::dispatch(),
        "version" | "--version" | "-V" => {
            println!("signaturmonster-service {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        }
        _ => {
            print!("{HELP}");
            Ok(())
        }
    }
}

pub fn init_logging(file: Option<std::path::PathBuf>) {
    let filter = tracing_subscriber::EnvFilter::try_from_env("SM_LOG")
        .unwrap_or_else(|_| "info".into());
    let builder = tracing_subscriber::fmt().with_env_filter(filter);
    match file.and_then(|p| std::fs::OpenOptions::new().create(true).append(true).open(p).ok()) {
        Some(f) => builder.with_ansi(false).with_writer(Mutex::new(f)).init(),
        None => builder.init(),
    }
}

/// Startet die Runtime: ein Worker-Thread, maximal ein Blocking-Thread
/// (für bcrypt und DNS-Auflösung).
pub fn run_blocking(cfg: Config, shutdown: Option<tokio::sync::oneshot::Receiver<()>>) -> Result<()> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .max_blocking_threads(1)
        .build()?;
    rt.block_on(run(cfg, shutdown))
}

async fn run(cfg: Config, shutdown: Option<tokio::sync::oneshot::Receiver<()>>) -> Result<()> {
    let _ = rustls::crypto::ring::default_provider().install_default();

    std::fs::create_dir_all(&cfg.data_dir)?;
    info!("Datenverzeichnis: {}", cfg.data_dir.display());

    let db = db::Db::open(&cfg.data_dir.join("signaturmonster.db"))?;
    db.init()?;
    let jwt_secret = api::load_jwt_secret(&cfg.data_dir)?;
    let acceptor = tls::load_or_create(&cfg.data_dir.join("tls"), &cfg.hostname)?;

    let state = Arc::new(AppState { cfg, db, jwt_secret, rate: Mutex::new(HashMap::new()) });

    let stop = async move {
        match shutdown {
            Some(rx) => {
                let _ = rx.await;
            }
            None => {
                let _ = tokio::signal::ctrl_c().await;
            }
        }
    };

    tokio::select! {
        r = smtp::serve(state.clone(), acceptor) => r?,
        r = api::serve(state.clone()) => r?,
        _ = stop => info!("Beende Signaturmonster Service"),
    }
    Ok(())
}
