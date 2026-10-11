//! Signatur-Injektion (Port des Kerns von handler.py + signature_engine.py).
//!
//! Anders als Pythons email-Modul wird die Mail nicht komplett neu
//! serialisiert: Nur die betroffenen text/html- bzw. text/plain-Teile werden
//! ersetzt, alle anderen Bytes (Header, Anhänge, Boundaries) bleiben exakt
//! erhalten.

use std::ops::Range;

use anyhow::Result;
use base64::Engine;
use mailparse::{DispositionType, MailHeaderMap, ParsedMail};

use crate::db::{Db, SenderProfile};
use crate::rules::{self, MatchedRule};

const POWERED_BY_HTML: &str = concat!(
    "\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">",
    "<tr><td align=\"center\" bgcolor=\"#181818\" style=\"background-color:#181818;",
    "padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;\">",
    "<a href=\"https://signaturmonster.monstersuite.de\" style=\"text-decoration:none;\">",
    "<span style=\"color:#888888;\">powered&nbsp;by&nbsp;</span>",
    "<span style=\"color:#fce499;\">Signatur</span>",
    "<span style=\"color:#ffffff;\">monster</span>",
    "</a></td></tr></table>"
);

pub struct Processed {
    pub data: Vec<u8>,
    pub sender: String,
    pub recipients: String,
    pub subject: String,
    pub action: &'static str,
    pub rule_id: Option<i64>,
    pub rule_name: String,
    pub rule: Option<MatchedRule>,
}

pub fn process(db: &Db, raw: &[u8]) -> Result<Processed> {
    let parsed = mailparse::parse_mail(raw)?;
    let h = &parsed.headers;
    let sender = rules::extract_address(&h.get_first_value("From").unwrap_or_default());
    let subject: String = h.get_first_value("Subject").unwrap_or_default().chars().take(200).collect();
    let recipients: Vec<String> = ["To", "Cc"]
        .iter()
        .filter_map(|k| h.get_first_value(k))
        .flat_map(|v| v.split(',').map(|a| a.trim().to_string()).collect::<Vec<_>>())
        .filter(|a| !a.is_empty())
        .collect();
    let is_reply = h.get_first_header("In-Reply-To").is_some() || h.get_first_header("References").is_some();

    let mut out = Processed {
        data: raw.to_vec(),
        sender: sender.clone(),
        recipients: recipients.join(", "),
        subject,
        action: "no_rule",
        rule_id: None,
        rule_name: String::new(),
        rule: None,
    };

    if is_cryptographically_signed(&parsed) {
        tracing::info!("Kryptografisch signierte Mail von {sender} – unverändert durchgeleitet");
        out.action = "passthrough_signed";
        return Ok(out);
    }

    let Some(rule) = rules::find_rule(db, &sender, is_reply, &recipients)? else {
        tracing::info!("Keine passende Regel für {sender}");
        return Ok(out);
    };

    let ctx = context(db.sender_profile(&sender)?.as_ref(), &rule);
    let html_sig = inline_css(&render(&rule.signature.html_content, &ctx));
    let text_sig = render(&rule.signature.text_content, &ctx);
    let mut html_block = format!("\n<div class=\"sm-sig\">{html_sig}</div>");
    if rule.powered_by {
        html_block.push_str(POWERED_BY_HTML);
    }

    let mut edits: Vec<(Range<usize>, Vec<u8>)> = Vec::new();
    let multipart = !parsed.subparts.is_empty();
    collect_edits(&parsed, raw, multipart, &html_sig, &html_block, &text_sig, &mut edits)?;

    edits.sort_by_key(|(r, _)| std::cmp::Reverse(r.start));
    for (range, bytes) in edits {
        out.data.splice(range, bytes);
    }

    tracing::info!("Signatur '{}' für {sender} eingefügt", rule.signature.name);
    out.action = "signed";
    out.rule_id = Some(rule.rule_id);
    out.rule_name = rule.signature.name.clone();
    out.rule = Some(rule);
    Ok(out)
}

fn collect_edits(
    part: &ParsedMail,
    root: &[u8],
    multipart: bool,
    html_sig: &str,
    html_block: &str,
    text_sig: &str,
    edits: &mut Vec<(Range<usize>, Vec<u8>)>,
) -> Result<()> {
    if !part.subparts.is_empty() {
        for sub in &part.subparts {
            collect_edits(sub, root, multipart, html_sig, html_block, text_sig, edits)?;
        }
        return Ok(());
    }
    if part.get_content_disposition().disposition == DispositionType::Attachment {
        return Ok(());
    }
    let mime = part.ctype.mimetype.as_str();
    let new_body = match mime {
        "text/html" => insert_before_body_end(&part.get_body()?, html_block),
        // Wie signature_engine.py: text/plain bekommt die Text-Signatur nur,
        // wenn es keine HTML-Signatur gibt oder die Mail reiner Text ist.
        "text/plain" if !multipart || html_sig.is_empty() => {
            format!("{}\n\n-- \n{}", part.get_body()?.trim_end_matches(['\r', '\n']), text_sig)
        }
        _ => return Ok(()),
    };
    let start = part.raw_bytes.as_ptr() as usize - root.as_ptr() as usize;
    edits.push((start..start + part.raw_bytes.len(), rebuild_part(part.raw_bytes, mime, &new_body)));
    Ok(())
}

fn insert_before_body_end(html: &str, block: &str) -> String {
    match html.to_ascii_lowercase().rfind("</body>") {
        Some(pos) => format!("{}{}{}", &html[..pos], block, &html[pos..]),
        None => format!("{html}{block}"),
    }
}

/// Behält alle Header des Teils außer Content-Type/-Transfer-Encoding und
/// kodiert den neuen Inhalt als UTF-8/Base64 (vermeidet CTE-Mismatches).
fn rebuild_part(raw: &[u8], mime: &str, body: &str) -> Vec<u8> {
    let header_end = find_header_end(raw);
    let header_text = String::from_utf8_lossy(&raw[..header_end]);

    let mut out = String::new();
    let mut skip = false;
    for line in header_text.lines() {
        if line.is_empty() {
            continue;
        }
        if line.starts_with([' ', '\t']) {
            if !skip {
                out.push_str(line);
                out.push_str("\r\n");
            }
            continue;
        }
        let name = line.split(':').next().unwrap_or("").trim().to_ascii_lowercase();
        skip = name == "content-type" || name == "content-transfer-encoding";
        if !skip {
            out.push_str(line);
            out.push_str("\r\n");
        }
    }
    out.push_str(&format!("Content-Type: {mime}; charset=\"utf-8\"\r\nContent-Transfer-Encoding: base64\r\n\r\n"));

    let encoded = base64::engine::general_purpose::STANDARD.encode(body.as_bytes());
    for chunk in encoded.as_bytes().chunks(76) {
        out.push_str(std::str::from_utf8(chunk).unwrap());
        out.push_str("\r\n");
    }
    out.into_bytes()
}

fn find_header_end(raw: &[u8]) -> usize {
    if raw.starts_with(b"\r\n") || raw.starts_with(b"\n") {
        return 0;
    }
    let crlf = raw.windows(4).position(|w| w == b"\r\n\r\n").map(|p| p + 4);
    let lf = raw.windows(2).position(|w| w == b"\n\n").map(|p| p + 2);
    match (crlf, lf) {
        (Some(a), Some(b)) => a.min(b),
        (a, b) => a.or(b).unwrap_or(raw.len()),
    }
}

fn is_cryptographically_signed(mail: &ParsedMail) -> bool {
    let root = mail.ctype.mimetype.as_str();
    if root == "multipart/signed" || root == "application/pkcs7-mime" {
        return true;
    }
    if mail.subparts.is_empty() {
        return mail.get_body().is_ok_and(|b| b.contains("-----BEGIN PGP SIGNED MESSAGE-----"));
    }
    mail.parts().any(|p| {
        matches!(
            p.ctype.mimetype.as_str(),
            "application/pkcs7-signature" | "application/x-pkcs7-signature" | "application/pgp-signature"
        )
    })
}

fn context(sender: Option<&SenderProfile>, rule: &MatchedRule) -> Vec<(&'static str, String)> {
    let s = sender.cloned().unwrap_or_default();
    let address = [s.street.clone(), format!("{} {}", s.postal_code, s.city).trim().to_string(), s.country.clone()]
        .into_iter()
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join(", ");
    let (disc_html, disc_text) =
        rule.disclaimer.as_ref().map(|d| (d.html_content.clone(), d.text_content.clone())).unwrap_or_default();
    vec![
        ("vorname", s.first_name.clone()),
        ("nachname", s.last_name.clone()),
        ("name", format!("{} {}", s.first_name, s.last_name).trim().to_string()),
        ("email", s.email),
        ("berufsbezeichnung", s.job_title),
        ("firma", s.company),
        ("telefon", s.phone),
        ("mobil", s.mobile),
        ("strasse", s.street),
        ("plz", s.postal_code),
        ("ort", s.city),
        ("land", s.country),
        ("adresse", address),
        ("foto", s.photo_url),
        ("disclaimer_html", disc_html),
        ("disclaimer_text", disc_text),
        ("campaign_banner", String::new()),
        ("campaign_banner_text", String::new()),
    ]
}

fn render(template: &str, ctx: &[(&str, String)]) -> String {
    ctx.iter().fold(template.to_string(), |t, (k, v)| t.replace(&format!("{{{{{k}}}}}"), v))
}

/// Gleiche Engine wie im Python-Proxy (css-inline ist im Kern Rust).
fn inline_css(html: &str) -> String {
    if !html.contains("<style") {
        return html.to_string();
    }
    let inliner = css_inline::CSSInliner::options().load_remote_stylesheets(false).build();
    match inliner.inline(html) {
        Ok(doc) => {
            // inline() liefert ein ganzes Dokument – wir brauchen nur den Body-Inhalt.
            let lower = doc.to_ascii_lowercase();
            match (lower.find("<body>"), lower.rfind("</body>")) {
                (Some(a), Some(b)) => doc[a + 6..b].to_string(),
                _ => doc,
            }
        }
        Err(e) => {
            tracing::debug!("CSS-Inlining übersprungen: {e}");
            html.to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rebuild_keeps_other_headers() {
        let raw = b"Content-Type: text/html;\r\n charset=iso-8859-1\r\nContent-ID: <x>\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<p>hi</p>\r\n";
        let out = String::from_utf8(rebuild_part(raw, "text/html", "<p>neu</p>")).unwrap();
        assert!(out.contains("Content-ID: <x>"));
        assert!(!out.contains("iso-8859-1"));
        assert!(!out.contains("quoted-printable"));
        assert!(out.contains("Content-Transfer-Encoding: base64"));
    }

    #[test]
    fn inserts_before_closing_body() {
        assert_eq!(insert_before_body_end("<BODY>a</BODY>", "S"), "<BODY>aS</BODY>");
        assert_eq!(insert_before_body_end("a", "S"), "aS");
    }
}
