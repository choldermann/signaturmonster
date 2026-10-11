//! REST-API + eingebettetes React-Frontend (ersetzt sm-backend + sm-nginx).
//! Im PoC sind nur Login, /me, Version, Health und die Signaturliste portiert;
//! alle anderen /api-Routen antworten mit 501.

use std::path::Path;
use std::sync::Arc;

use anyhow::Result;
use axum::extract::{FromRequestParts, State};
use axum::http::{header, request::Parts, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64URL;
use base64::Engine;
use hmac::{Hmac, KeyInit, Mac};
use rust_embed::Embed;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha256;

use crate::AppState;

type Shared = Arc<AppState>;

const TOKEN_DAYS: i64 = 30;

#[derive(Embed)]
#[folder = "../../frontend/dist/"]
struct Frontend;

pub async fn serve(state: Shared) -> Result<()> {
    let addr = state.cfg.http_addr;
    let app = Router::new()
        .route("/health", get(|| async { Json(json!({"status": "ok"})) }))
        .route("/api/version", get(version))
        .route("/api/auth/login", post(login))
        .route("/api/auth/me", get(me))
        .route("/api/signatures", get(signatures))
        .route("/api/signatures/", get(signatures))
        .route("/api/proxy/status", get(proxy_status))
        .fallback(fallback)
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("Web-UI + API auf http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}

pub struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"detail": self.1}))).into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(e: anyhow::Error) -> Self {
        tracing::error!("API-Fehler: {e}");
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, "Interner Fehler".into())
    }
}

// ── JWT (HS256, kompatibel zu python-jose im bisherigen Backend) ──────────────

pub fn load_jwt_secret(data_dir: &Path) -> Result<Vec<u8>> {
    if let Ok(s) = std::env::var("JWT_SECRET").map(|s| s.trim().to_string()) {
        if !s.is_empty() && s != "change-me-in-production" {
            return Ok(s.into_bytes());
        }
    }
    let file = data_dir.join(".jwt_secret");
    if let Ok(s) = std::fs::read_to_string(&file) {
        if !s.trim().is_empty() {
            return Ok(s.trim().as_bytes().to_vec());
        }
    }
    let mut raw = [0u8; 32];
    getrandom::fill(&mut raw).map_err(|e| anyhow::anyhow!("Zufallszahlen: {e}"))?;
    let secret: String = raw.iter().map(|b| format!("{b:02x}")).collect();
    crate::tls::write_private(&file, &secret)?;
    tracing::info!("JWT-Secret erzeugt und in {} gespeichert", file.display());
    Ok(secret.into_bytes())
}

fn sign(secret: &[u8], msg: &str) -> Hmac<Sha256> {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC akzeptiert jede Schlüssellänge");
    mac.update(msg.as_bytes());
    mac
}

fn create_token(secret: &[u8], user_id: i64) -> String {
    let header = B64URL.encode(br#"{"alg":"HS256","typ":"JWT"}"#);
    let exp = chrono::Utc::now().timestamp() + TOKEN_DAYS * 86400;
    let payload = B64URL.encode(json!({"sub": user_id.to_string(), "exp": exp}).to_string());
    let msg = format!("{header}.{payload}");
    let sig = B64URL.encode(sign(secret, &msg).finalize().into_bytes());
    format!("{msg}.{sig}")
}

fn decode_token(secret: &[u8], token: &str) -> Option<i64> {
    let (msg, sig) = token.rsplit_once('.')?;
    sign(secret, msg).verify_slice(&B64URL.decode(sig).ok()?).ok()?;
    let header: Value = serde_json::from_slice(&B64URL.decode(msg.split('.').next()?).ok()?).ok()?;
    if header["alg"] != "HS256" {
        return None;
    }
    let payload: Value = serde_json::from_slice(&B64URL.decode(msg.split('.').nth(1)?).ok()?).ok()?;
    if payload["exp"].as_i64()? < chrono::Utc::now().timestamp() {
        return None;
    }
    payload["sub"].as_str()?.parse().ok()
}

/// Extractor: verlangt "Authorization: Bearer <jwt>"
pub struct AuthUser(pub crate::db::User);

impl FromRequestParts<Shared> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &Shared) -> Result<Self, Self::Rejection> {
        let unauthorized = || ApiError(StatusCode::UNAUTHORIZED, "Nicht angemeldet".into());
        let token = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or_else(unauthorized)?;
        let id = decode_token(&state.jwt_secret, token).ok_or_else(unauthorized)?;
        let user = state.db.user_by_id(id)?.ok_or_else(unauthorized)?;
        Ok(AuthUser(user))
    }
}

// ── Handler ──────────────────────────────────────────────────────────────────

async fn version() -> Json<Value> {
    Json(json!({"version": format!("{}-native", env!("CARGO_PKG_VERSION")), "product": "signaturmonster"}))
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

async fn login(State(state): State<Shared>, Json(req): Json<LoginRequest>) -> Result<Json<Value>, ApiError> {
    let invalid = || ApiError(StatusCode::UNAUTHORIZED, "Ungültiger Benutzername oder Passwort".into());
    let user = state.db.user_by_name(&req.username)?.ok_or_else(invalid)?;
    let hash = user.password_hash.clone();
    let ok = tokio::task::spawn_blocking(move || bcrypt::verify(req.password, &hash).unwrap_or(false))
        .await
        .unwrap_or(false);
    if !ok {
        tracing::warn!("Login fehlgeschlagen: Benutzer '{}'", user.name);
        return Err(invalid());
    }
    tracing::info!("Login erfolgreich: Benutzer '{}'", user.name);
    Ok(Json(json!({
        "token": create_token(&state.jwt_secret, user.id),
        "user": {"id": user.id, "name": user.name, "is_admin": user.is_admin},
    })))
}

async fn me(AuthUser(user): AuthUser) -> Json<Value> {
    Json(json!({"id": user.id, "name": user.name, "is_admin": user.is_admin}))
}

async fn signatures(State(state): State<Shared>, _user: AuthUser) -> Result<Json<Value>, ApiError> {
    Ok(Json(serde_json::to_value(state.db.signatures()?).map_err(anyhow::Error::from)?))
}

/// Der Proxy läuft im selben Prozess – wenn die API antwortet, läuft er auch.
async fn proxy_status(State(state): State<Shared>, _user: AuthUser) -> Json<Value> {
    Json(json!({"online": true, "host": state.cfg.smtp_addr.ip().to_string(), "port": state.cfg.smtp_addr.port()}))
}

async fn fallback(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    if path.starts_with("api/") {
        return ApiError(StatusCode::NOT_IMPLEMENTED, format!("/{path} ist im Native-PoC noch nicht portiert"))
            .into_response();
    }
    // SPA: unbekannte Pfade liefern index.html
    let (file, name) = match Frontend::get(path) {
        Some(f) if !path.is_empty() => (f, path),
        _ => match Frontend::get("index.html") {
            Some(f) => (f, "index.html"),
            None => return (StatusCode::NOT_FOUND, "Frontend nicht eingebettet").into_response(),
        },
    };
    let mime = mime_guess::from_path(name).first_or_octet_stream();
    ([(header::CONTENT_TYPE, mime.as_ref().to_string())], file.data).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_roundtrip() {
        let t = create_token(b"geheim", 42);
        assert_eq!(decode_token(b"geheim", &t), Some(42));
        assert_eq!(decode_token(b"falsch", &t), None);
    }
}
