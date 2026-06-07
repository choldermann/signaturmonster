import ssl, os, ipaddress, datetime, logging
from pathlib import Path

logger = logging.getLogger(__name__)

_CERT_DIR  = Path(os.getenv("TLS_CERT_DIR", "/data/tls"))
_CA_KEY    = _CERT_DIR / "ca.key"
_CA_CERT   = _CERT_DIR / "ca.crt"
_SRV_KEY   = _CERT_DIR / "smtp.key"
_SRV_CERT  = _CERT_DIR / "smtp.crt"


def ensure_tls_context() -> ssl.SSLContext:
    cert_path = Path(os.getenv("TLS_CERT_FILE", str(_SRV_CERT)))
    key_path  = Path(os.getenv("TLS_KEY_FILE",  str(_SRV_KEY)))

    if not (cert_path.exists() and key_path.exists()):
        _generate_ca_and_server()

    ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    logger.info(f"TLS context loaded from {cert_path}")
    return ctx


def _generate_ca_and_server() -> None:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    _CERT_DIR.mkdir(parents=True, exist_ok=True)

    # ── CA key + cert ────────────────────────────────────────────────────────
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME,         "Signaturmonster CA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME,   "Signaturmonster"),
    ])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(x509.KeyUsage(
            digital_signature=False, content_commitment=False,
            key_encipherment=False, data_encipherment=False,
            key_agreement=False, key_cert_sign=True,
            crl_sign=True, encipher_only=False, decipher_only=False,
        ), critical=True)
        .sign(ca_key, hashes.SHA256())
    )

    # ── Server key + cert signed by CA ───────────────────────────────────────
    srv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    hostname = os.getenv("SMTP_HOSTNAME", "signaturmonster")
    srv_name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME,       hostname),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Signaturmonster"),
    ])
    san = x509.SubjectAlternativeName([
        x509.DNSName(hostname),
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
    ])
    srv_cert = (
        x509.CertificateBuilder()
        .subject_name(srv_name)
        .issuer_name(ca_name)
        .public_key(srv_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(san, critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    # ── Write all four files ─────────────────────────────────────────────────
    for path, key in [(_CA_KEY, ca_key), (_SRV_KEY, srv_key)]:
        path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))
    _CA_CERT.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    _SRV_CERT.write_bytes(srv_cert.public_bytes(serialization.Encoding.PEM))

    logger.info(f"PKI generated: CA={_CA_CERT}, Server={_SRV_CERT} (CN={hostname})")
