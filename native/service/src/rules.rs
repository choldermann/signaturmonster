//! Port von POST /api/rules/match (backend/routers/rules.py).

use std::collections::HashSet;

use anyhow::Result;
use chrono::{Datelike, Utc};

use crate::db::{Db, Disclaimer, Signature, SmtpAccount};

pub struct MatchedRule {
    pub rule_id: i64,
    pub signature: Signature,
    pub disclaimer: Option<Disclaimer>,
    pub smtp_account: Option<SmtpAccount>,
    pub powered_by: bool,
    pub forward_to: Vec<String>,
}

/// "Max <max@firma.de>" → "max@firma.de"
pub fn extract_address(header: &str) -> String {
    match (header.find('<'), header.rfind('>')) {
        (Some(a), Some(b)) if a < b => header[a + 1..b].trim().to_lowercase(),
        _ => header.trim().to_lowercase(),
    }
}

pub fn domain_of(addr: &str) -> &str {
    addr.rsplit_once('@').map(|(_, d)| d).unwrap_or("")
}

pub fn find_rule(db: &Db, sender: &str, is_reply: bool, recipients: &[String]) -> Result<Option<MatchedRule>> {
    let domain = domain_of(sender);

    let internal_domains: HashSet<String> = db
        .setting("internal_domains")?
        .unwrap_or_default()
        .split(',')
        .map(|d| d.trim().to_lowercase())
        .filter(|d| !d.is_empty())
        .collect();

    let tz: chrono_tz::Tz = db.setting("timezone")?.and_then(|t| t.parse().ok()).unwrap_or(chrono_tz::UTC);
    let now = Utc::now().with_timezone(&tz);
    let weekday = now.weekday().num_days_from_monday();
    let current = now.format("%H:%M").to_string();

    let norm_recipients: HashSet<String> = recipients.iter().map(|r| extract_address(r)).collect();
    let recipient_domains: HashSet<String> =
        norm_recipients.iter().map(|r| domain_of(r).to_string()).filter(|d| !d.is_empty()).collect();

    let eq = |field: &Option<String>, value: &str| field.as_deref().is_some_and(|f| f.to_lowercase() == value);
    let set = |field: &Option<String>| field.as_deref().filter(|s| !s.is_empty()).map(str::to_lowercase);

    for rule in db.active_rules()? {
        if is_reply && !rule.apply_on_reply || !is_reply && !rule.apply_on_new {
            continue;
        }

        let sender_match = eq(&rule.match_sender, sender)
            || eq(&rule.match_domain, domain)
            || (set(&rule.match_sender).is_none() && set(&rule.match_domain).is_none());
        if !sender_match {
            continue;
        }

        let (mr, mrd) = (set(&rule.match_recipient), set(&rule.match_recipient_domain));
        if mr.is_some() || mrd.is_some() {
            let hit = mr.is_some_and(|r| norm_recipients.contains(&r))
                || mrd.is_some_and(|d| recipient_domains.contains(&d));
            if !hit {
                continue;
            }
        }

        let scope = rule.recipient_scope.as_deref().unwrap_or("all");
        if scope != "all" && !internal_domains.is_empty() && !recipient_domains.is_empty() {
            let all_internal = recipient_domains.is_subset(&internal_domains);
            if scope == "external_only" && all_internal || scope == "internal_only" && !all_internal {
                continue;
            }
        }

        if let Some(dow) = rule.days_of_week.as_deref().filter(|d| !d.is_empty()) {
            let allowed: HashSet<u32> = dow.split(',').filter_map(|d| d.trim().parse().ok()).collect();
            if !allowed.contains(&weekday) {
                continue;
            }
        }

        if let Some(tf) = set(&rule.time_from) {
            if current < tf {
                continue;
            }
        }
        if let Some(tu) = set(&rule.time_until) {
            if current >= tu {
                continue;
            }
        }

        let Some(signature) = rule.signature_id.map(|id| db.signature(id)).transpose()?.flatten() else {
            continue;
        };

        return Ok(Some(MatchedRule {
            rule_id: rule.id,
            signature,
            disclaimer: rule.disclaimer_id.map(|id| db.disclaimer(id)).transpose()?.flatten(),
            smtp_account: rule.smtp_account_id.map(|id| db.smtp_account(id)).transpose()?.flatten(),
            powered_by: db.setting("powered_by_enabled")?.as_deref() != Some("false"),
            forward_to: rule
                .forward_to
                .unwrap_or_default()
                .split(',')
                .map(|a| a.trim().to_string())
                .filter(|a| !a.is_empty())
                .collect(),
        }));
    }
    Ok(None)
}
