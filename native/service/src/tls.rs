//! STARTTLS-Zertifikate: gleiche Dateien wie tls_utils.py (ca.crt, ca.key,
//! smtp.crt, smtp.key), damit Clients, die die CA schon importiert haben,
//! nach dem Umstieg weiter funktionieren.

use std::path::Path;
use std::sync::Arc;

use anyhow::{Context, Result};
use rcgen::{
    BasicConstraints, CertificateParams, DistinguishedName, DnType, IsCa, Issuer, KeyPair, KeyUsagePurpose, SanType,
};
use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use tokio_rustls::TlsAcceptor;

pub fn load_or_create(dir: &Path, hostname: &str) -> Result<TlsAcceptor> {
    let (cert_path, key_path) = (dir.join("smtp.crt"), dir.join("smtp.key"));
    if !(cert_path.exists() && key_path.exists()) {
        generate(dir, hostname)?;
    }

    let certs = CertificateDer::pem_file_iter(&cert_path)
        .with_context(|| format!("{} lesen", cert_path.display()))?
        .collect::<Result<Vec<_>, _>>()?;
    let key = PrivateKeyDer::from_pem_file(&key_path).with_context(|| format!("{} lesen", key_path.display()))?;
    let cfg = rustls::ServerConfig::builder().with_no_client_auth().with_single_cert(certs, key)?;
    tracing::info!("TLS-Zertifikat geladen: {}", cert_path.display());
    Ok(TlsAcceptor::from(Arc::new(cfg)))
}

fn generate(dir: &Path, hostname: &str) -> Result<()> {
    std::fs::create_dir_all(dir)?;

    let mut ca_dn = DistinguishedName::new();
    ca_dn.push(DnType::CommonName, "Signaturmonster CA");
    ca_dn.push(DnType::OrganizationName, "Signaturmonster");
    let mut ca_params = CertificateParams::default();
    ca_params.distinguished_name = ca_dn;
    ca_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    ca_params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
    ca_params.not_after = rcgen::date_time_ymd(2036, 1, 1);
    let ca_key = KeyPair::generate()?;
    let ca_cert = ca_params.self_signed(&ca_key)?;

    let mut srv_params = CertificateParams::new(vec!["localhost".to_string(), hostname.to_string()])?;
    srv_params.subject_alt_names.push(SanType::IpAddress("127.0.0.1".parse()?));
    srv_params.distinguished_name.push(DnType::CommonName, "Signaturmonster SMTP");
    srv_params.not_after = rcgen::date_time_ymd(2036, 1, 1);
    let srv_key = KeyPair::generate()?;

    std::fs::write(dir.join("ca.crt"), ca_cert.pem())?;
    write_private(&dir.join("ca.key"), &ca_key.serialize_pem())?;
    let issuer = Issuer::new(ca_params, ca_key);
    let srv_cert = srv_params.signed_by(&srv_key, &issuer)?;
    // Kette: Server-Zertifikat + CA
    std::fs::write(dir.join("smtp.crt"), format!("{}{}", srv_cert.pem(), ca_cert.pem()))?;
    write_private(&dir.join("smtp.key"), &srv_key.serialize_pem())?;

    tracing::info!("Neue CA + SMTP-Zertifikat erzeugt in {} – ca.crt im Mailprogramm importieren", dir.display());
    Ok(())
}

/// Schreibt Geheimnisse (Schlüssel, Secrets) nur für den Dienst-Benutzer lesbar.
pub fn write_private(path: &Path, contents: &str) -> Result<()> {
    let mut opts = std::fs::OpenOptions::new();
    opts.write(true).create(true).truncate(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut opts, 0o600);
    std::io::Write::write_all(&mut opts.open(path)?, contents.as_bytes())?;
    Ok(())
}
