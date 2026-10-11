//! SMTP-Submission-Server (ersetzt aiosmtpd): EHLO, STARTTLS, AUTH PLAIN/LOGIN,
//! MAIL/RCPT/DATA. Alle Verbindungen laufen als Tasks auf demselben Thread.

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{bail, Result};
use base64::Engine;
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use tokio_rustls::TlsAcceptor;

use crate::AppState;

const MAX_LINE: u64 = 4096;
const MAX_RCPTS: usize = 100;
const MAX_AUTH_FAILURES: u32 = 3;
const IDLE_TIMEOUT: Duration = Duration::from_secs(300);

pub async fn serve(state: Arc<AppState>, acceptor: TlsAcceptor) -> Result<()> {
    let listener = TcpListener::bind(state.cfg.smtp_addr).await?;
    let tls_note = if state.cfg.smtp_require_tls { "STARTTLS + AUTH erforderlich" } else { "AUTH erforderlich, TLS optional" };
    tracing::info!("SMTP-Proxy lauscht auf {} ({tls_note})", state.cfg.smtp_addr);
    loop {
        let (sock, peer) = listener.accept().await?;
        let (state, acceptor) = (state.clone(), acceptor.clone());
        tokio::spawn(async move {
            if let Err(e) = connection(state, acceptor, sock, peer).await {
                tracing::debug!("SMTP-Verbindung {peer} beendet: {e}");
            }
        });
    }
}

#[derive(Default)]
struct Session {
    helo: bool,
    tls: bool,
    user: Option<String>,
    auth_failures: u32,
    mail_from: Option<String>,
    rcpts: Vec<String>,
}

enum Next {
    Quit,
    StartTls,
}

async fn connection(state: Arc<AppState>, acceptor: TlsAcceptor, sock: TcpStream, peer: SocketAddr) -> Result<()> {
    let mut plain = BufReader::new(sock);
    reply(&mut plain, &format!("220 {} ESMTP Signaturmonster", state.cfg.hostname)).await?;
    let mut s = Session::default();

    if let Next::StartTls = dialog(&state, &mut plain, &mut s, peer).await? {
        // Gepufferte Klartext-Daten nach STARTTLS wären eine Command-Injection (CVE-2011-0411)
        if !plain.buffer().is_empty() {
            bail!("Pipelining nach STARTTLS");
        }
        let tls = acceptor.accept(plain.into_inner()).await?;
        let mut secure = BufReader::new(tls);
        // RFC 3207: Zustand nach STARTTLS komplett zurücksetzen
        s = Session { tls: true, ..Default::default() };
        dialog(&state, &mut secure, &mut s, peer).await?;
    }
    Ok(())
}

async fn reply<S: AsyncRead + AsyncWrite + Unpin>(io: &mut BufReader<S>, line: &str) -> Result<()> {
    io.get_mut().write_all(format!("{line}\r\n").as_bytes()).await?;
    io.get_mut().flush().await?;
    Ok(())
}

async fn read_line<S: AsyncRead + Unpin>(io: &mut BufReader<S>, max: u64) -> Result<Option<Vec<u8>>> {
    let mut buf = Vec::new();
    let n = timeout(IDLE_TIMEOUT, (&mut *io).take(max).read_until(b'\n', &mut buf)).await??;
    if n == 0 {
        return Ok(None);
    }
    if !buf.ends_with(b"\n") {
        bail!("Zeile zu lang");
    }
    Ok(Some(buf))
}

/// Adresse aus "FROM:<a@b.de> SIZE=123" bzw. "TO:<a@b.de>"
fn parse_path(arg: &str, prefix: &str) -> Option<(String, String)> {
    let rest = arg.get(..prefix.len()).filter(|p| p.eq_ignore_ascii_case(prefix)).map(|_| &arg[prefix.len()..])?;
    let rest = rest.trim_start();
    let (addr, params) = match rest.strip_prefix('<') {
        Some(r) => {
            let end = r.find('>')?;
            (&r[..end], &r[end + 1..])
        }
        None => rest.split_once(' ').unwrap_or((rest, "")),
    };
    Some((addr.trim().to_string(), params.trim().to_string()))
}

async fn dialog<S: AsyncRead + AsyncWrite + Unpin>(
    state: &Arc<AppState>,
    io: &mut BufReader<S>,
    s: &mut Session,
    peer: SocketAddr,
) -> Result<Next> {
    let cfg = &state.cfg;
    let auth_allowed = |s: &Session| s.tls || !cfg.smtp_require_tls;

    while let Some(line) = read_line(io, MAX_LINE).await? {
        let line = String::from_utf8_lossy(&line).trim_end().to_string();
        let (verb, arg) = line.split_once(' ').unwrap_or((&line, ""));
        match verb.to_ascii_uppercase().as_str() {
            "EHLO" => {
                s.helo = true;
                s.mail_from = None;
                s.rcpts.clear();
                let mut lines = vec![cfg.hostname.clone(), format!("SIZE {}", cfg.max_message_size), "8BITMIME".into()];
                if !s.tls {
                    lines.push("STARTTLS".into());
                }
                if auth_allowed(s) {
                    lines.push("AUTH PLAIN LOGIN".into());
                }
                lines.push("ENHANCEDSTATUSCODES".into());
                let last = lines.len() - 1;
                for (i, l) in lines.iter().enumerate() {
                    reply(io, &format!("250{}{l}", if i == last { ' ' } else { '-' })).await?;
                }
            }
            "HELO" => {
                s.helo = true;
                reply(io, &format!("250 {}", cfg.hostname)).await?;
            }
            "STARTTLS" if s.tls => reply(io, "503 5.5.1 TLS bereits aktiv").await?,
            "STARTTLS" => {
                reply(io, "220 2.0.0 Ready to start TLS").await?;
                return Ok(Next::StartTls);
            }
            "AUTH" if !s.helo => reply(io, "503 5.5.1 Erst EHLO senden").await?,
            "AUTH" if !auth_allowed(s) => reply(io, "538 5.7.11 Verschlüsselung erforderlich (STARTTLS)").await?,
            "AUTH" if s.user.is_some() => reply(io, "503 5.5.1 Bereits authentifiziert").await?,
            "AUTH" => {
                let Some(creds) = read_auth(io, arg).await? else {
                    reply(io, "501 5.5.2 Ungültige AUTH-Daten").await?;
                    continue;
                };
                if verify_smtp_user(state, &creds.0, &creds.1).await {
                    tracing::info!("SMTP-Auth OK: '{}' von {peer}", creds.0);
                    s.user = Some(creds.0);
                    reply(io, "235 2.7.0 Authentication successful").await?;
                } else {
                    tracing::warn!("SMTP-Auth FEHLGESCHLAGEN: '{}' von {peer}", creds.0);
                    s.auth_failures += 1;
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    reply(io, "535 5.7.8 Authentication credentials invalid").await?;
                    if s.auth_failures >= MAX_AUTH_FAILURES {
                        reply(io, "421 4.7.0 Zu viele Fehlversuche").await?;
                        return Ok(Next::Quit);
                    }
                }
            }
            "MAIL" if s.user.is_none() => reply(io, "530 5.7.0 Authentication required").await?,
            "MAIL" => match parse_path(arg, "FROM:") {
                Some((addr, params)) => {
                    let size = params
                        .split_whitespace()
                        .find_map(|p| p.get(..5).filter(|k| k.eq_ignore_ascii_case("SIZE=")).map(|_| &p[5..]))
                        .and_then(|v| v.parse::<usize>().ok());
                    if size.is_some_and(|n| n > cfg.max_message_size) {
                        reply(io, "552 5.3.4 Nachricht zu groß").await?;
                    } else {
                        s.mail_from = Some(addr);
                        s.rcpts.clear();
                        reply(io, "250 2.1.0 OK").await?;
                    }
                }
                None => reply(io, "501 5.5.4 Syntax: MAIL FROM:<adresse>").await?,
            },
            "RCPT" if s.mail_from.is_none() => reply(io, "503 5.5.1 Erst MAIL FROM").await?,
            "RCPT" => match parse_path(arg, "TO:") {
                Some(_) if s.rcpts.len() >= MAX_RCPTS => reply(io, "452 4.5.3 Zu viele Empfänger").await?,
                Some((addr, _)) if !addr.is_empty() => {
                    s.rcpts.push(addr);
                    reply(io, "250 2.1.5 OK").await?;
                }
                _ => reply(io, "501 5.5.4 Syntax: RCPT TO:<adresse>").await?,
            },
            "DATA" if s.rcpts.is_empty() => reply(io, "503 5.5.1 Erst RCPT TO").await?,
            "DATA" => {
                reply(io, "354 Mail eingeben, Ende mit <CRLF>.<CRLF>").await?;
                let data = read_data(io, cfg.max_message_size).await?;
                let from = s.mail_from.take().unwrap_or_default();
                let rcpts = std::mem::take(&mut s.rcpts);
                let Some(data) = data else {
                    reply(io, "552 5.3.4 Nachricht zu groß").await?;
                    continue;
                };
                if !state.rate_ok(peer.ip()) {
                    reply(io, "451 4.7.1 Rate limit exceeded, please try again later").await?;
                    continue;
                }
                accept_message(state, data, from, rcpts);
                reply(io, "250 2.0.0 Message accepted for delivery").await?;
            }
            "RSET" => {
                s.mail_from = None;
                s.rcpts.clear();
                reply(io, "250 2.0.0 OK").await?;
            }
            "NOOP" => reply(io, "250 2.0.0 OK").await?,
            "VRFY" => reply(io, "252 2.5.0 Kann Benutzer nicht prüfen").await?,
            "QUIT" => {
                reply(io, "221 2.0.0 Bye").await?;
                return Ok(Next::Quit);
            }
            _ => reply(io, "502 5.5.2 Befehl nicht unterstützt").await?,
        }
    }
    Ok(Next::Quit)
}

/// Verarbeitet die Mail sofort (Signatur) und stellt sie im Hintergrund zu.
fn accept_message(state: &Arc<AppState>, data: Vec<u8>, from: String, rcpts: Vec<String>) {
    let processed = match crate::mail::process(&state.db, &data) {
        Ok(p) => p,
        Err(e) => {
            // Fail-open wie im Python-Proxy: Mail unverändert zustellen
            tracing::error!("Mail-Verarbeitung fehlgeschlagen, sende unverändert: {e}");
            crate::mail::Processed {
                data,
                sender: from.clone(),
                recipients: rcpts.join(", "),
                subject: String::new(),
                action: "error",
                rule_id: None,
                rule_name: String::new(),
                rule: None,
            }
        }
    };
    let state = state.clone();
    tokio::spawn(async move { crate::relay::relay_and_log(&state, processed, from, rcpts).await });
}

/// Liest den DATA-Block, entfernt Dot-Stuffing. `None` = Größenlimit überschritten
/// (der Rest wird trotzdem bis zum Terminator gelesen, damit der Dialog synchron bleibt).
async fn read_data<S: AsyncRead + Unpin>(io: &mut BufReader<S>, max: usize) -> Result<Option<Vec<u8>>> {
    let mut data = Vec::new();
    let mut too_big = false;
    loop {
        let Some(line) = read_line(io, 1024 * 1024).await? else { bail!("Verbindung während DATA getrennt") };
        if line == b".\r\n" || line == b".\n" {
            break;
        }
        if too_big {
            continue;
        }
        let line = if line.starts_with(b"..") { &line[1..] } else { &line[..] };
        data.extend_from_slice(line);
        if data.len() > max {
            too_big = true;
            data = Vec::new();
        }
    }
    Ok((!too_big).then_some(data))
}

/// AUTH PLAIN [initial] | AUTH LOGIN [initial] → (Benutzer, Passwort)
async fn read_auth<S: AsyncRead + AsyncWrite + Unpin>(
    io: &mut BufReader<S>,
    arg: &str,
) -> Result<Option<(String, String)>> {
    let b64 = base64::engine::general_purpose::STANDARD;
    let (mech, initial) = arg.split_once(' ').unwrap_or((arg, ""));

    async fn prompt<S: AsyncRead + AsyncWrite + Unpin>(io: &mut BufReader<S>, challenge: &str) -> Result<Option<String>> {
        reply(io, &format!("334 {challenge}")).await?;
        let line = read_line(io, MAX_LINE).await?.unwrap_or_default();
        let line = String::from_utf8_lossy(&line).trim().to_string();
        Ok((line != "*").then_some(line))
    }
    let decode = |s: &str| b64.decode(s.trim()).ok().and_then(|v| String::from_utf8(v).ok());

    match mech.to_ascii_uppercase().as_str() {
        "PLAIN" => {
            let resp = if initial.is_empty() { prompt(io, "").await? } else { Some(initial.to_string()) };
            let Some(raw) = resp.as_deref().and_then(decode) else { return Ok(None) };
            let mut parts = raw.split('\0');
            let (_authzid, user, pass) = (parts.next(), parts.next(), parts.next());
            Ok(user.zip(pass).map(|(u, p)| (u.to_string(), p.to_string())))
        }
        "LOGIN" => {
            let user = if initial.is_empty() { prompt(io, "VXNlcm5hbWU6").await? } else { Some(initial.to_string()) };
            let Some(user) = user.as_deref().and_then(decode) else { return Ok(None) };
            let Some(pass) = prompt(io, "UGFzc3dvcmQ6").await?.as_deref().and_then(decode) else { return Ok(None) };
            Ok(Some((user, pass)))
        }
        _ => Ok(None),
    }
}

/// bcrypt ist absichtlich langsam (~200 ms) → auf den einen Blocking-Thread auslagern.
async fn verify_smtp_user(state: &Arc<AppState>, user: &str, pass: &str) -> bool {
    let Ok(Some(hash)) = state.db.smtp_user_hash(user) else { return false };
    let pass = pass.to_string();
    tokio::task::spawn_blocking(move || bcrypt::verify(pass, &hash).unwrap_or(false)).await.unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::parse_path;

    #[test]
    fn parses_paths() {
        assert_eq!(parse_path("FROM:<a@b.de> SIZE=10", "FROM:"), Some(("a@b.de".into(), "SIZE=10".into())));
        assert_eq!(parse_path("from: <a@b.de>", "FROM:"), Some(("a@b.de".into(), "".into())));
        assert_eq!(parse_path("TO:<>", "TO:"), Some(("".into(), "".into())));
        assert_eq!(parse_path("XX:<a>", "TO:"), None);
    }
}
