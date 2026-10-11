//! Weiterleitung an den Kunden-Mailserver (Port von relay.py).

use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use lettre::address::{Address, Envelope};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

use crate::db::{MailLogEntry, SmtpAccount};
use crate::mail::Processed;
use crate::rules::domain_of;
use crate::AppState;

async fn send(acc: &SmtpAccount, from: &str, rcpts: &[String], data: &[u8]) -> Result<()> {
    // Port 465 = implizites TLS; Port 25 bzw. lokales MTA (z.B. Postfix auf dem
    // selben Host) = TLS nur wenn angeboten; sonst STARTTLS erzwingen.
    let local = matches!(acc.relay_host.as_str(), "localhost" | "127.0.0.1" | "::1");
    let builder = if acc.relay_port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&acc.relay_host)?
    } else if acc.relay_port == 25 || local {
        let params = TlsParameters::new(acc.relay_host.clone())?;
        AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&acc.relay_host).tls(Tls::Opportunistic(params))
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&acc.relay_host)?
    };
    let mut builder = builder.port(acc.relay_port).timeout(Some(Duration::from_secs(30)));
    if !acc.relay_user.is_empty() {
        builder = builder.credentials(Credentials::new(acc.relay_user.clone(), acc.relay_pass.clone()));
    }
    let from: Option<Address> = if from.is_empty() { None } else { Some(from.parse()?) };
    let to = rcpts.iter().map(|r| r.parse()).collect::<Result<Vec<Address>, _>>()?;
    // lettre schreibt immer "\r\n.\r\n" – das letzte CRLF der Mail gehört dazu,
    // sonst entsteht eine zusätzliche Leerzeile (bricht "byte-genau").
    let data = data.strip_suffix(b"\r\n").or_else(|| data.strip_suffix(b"\n")).unwrap_or(data);
    builder.build().send_raw(&Envelope::new(from, to)?, data).await?;
    Ok(())
}

/// Priorität wie relay.py: Konto aus der Regel → Domain/Default-Konto → Konfiguration.
fn pick_account(state: &AppState, p: &Processed, envelope_from: &str) -> Result<SmtpAccount> {
    if let Some(acc) = p.rule.as_ref().and_then(|r| r.smtp_account.clone()).filter(|a| !a.relay_host.is_empty()) {
        return Ok(acc);
    }
    let sender = if p.sender.is_empty() { envelope_from } else { &p.sender };
    if let Some(acc) = state.db.smtp_account_for_domain(domain_of(sender))?.filter(|a| !a.relay_host.is_empty()) {
        return Ok(acc);
    }
    state.cfg.relay_fallback.clone().ok_or_else(|| anyhow!("Kein SMTP-Konto konfiguriert"))
}

/// Läuft nach dem "250 OK" an den Client im Hintergrund (Early ACK wie v0.9.1).
pub async fn relay_and_log(state: &AppState, p: Processed, envelope_from: String, rcpts: Vec<String>) {
    let t0 = Instant::now();
    let from = if envelope_from.is_empty() { p.sender.clone() } else { envelope_from.clone() };

    let result = match pick_account(state, &p, &envelope_from) {
        Ok(acc) => {
            tracing::info!("Relay über {}:{} ({}) für {}", acc.relay_host, acc.relay_port, acc.name, from);
            let r = send(&acc, &from, &rcpts, &p.data).await;
            if r.is_ok() {
                for fwd in p.rule.iter().flat_map(|r| r.forward_to.iter()) {
                    if let Err(e) = send(&acc, &from, std::slice::from_ref(fwd), &p.data).await {
                        tracing::warn!("Weiterleitungskopie an {fwd} fehlgeschlagen: {e}");
                    }
                }
            }
            r
        }
        Err(e) => Err(e),
    };

    let relay_error = match &result {
        Ok(()) => {
            tracing::info!("Mail von {from} erfolgreich zugestellt");
            String::new()
        }
        Err(e) => {
            tracing::error!("Relay für {from} fehlgeschlagen: {e}");
            e.to_string().chars().take(300).collect()
        }
    };

    let entry = MailLogEntry {
        sender: &p.sender,
        recipients: &p.recipients,
        subject: &p.subject,
        rule_id: p.rule_id,
        rule_name: &p.rule_name,
        action: p.action,
        relay_ok: result.is_ok(),
        relay_error: &relay_error,
        duration_ms: t0.elapsed().as_millis() as i64,
        message: &p.data,
    };
    if let Err(e) = state.db.insert_mail_log(&entry) {
        tracing::warn!("Mail-Log konnte nicht geschrieben werden: {e}");
    }
}
