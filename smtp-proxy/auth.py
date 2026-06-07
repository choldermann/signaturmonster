import requests, logging
from aiosmtpd.smtp import AuthResult, LoginPassword

logger = logging.getLogger(__name__)


class SMTPAuthenticator:
    """
    Synchronous authenticator — aiosmtpd 1.4.x calls this synchronously from
    within _authenticate(); async callables would return an unawaited coroutine
    and always succeed.
    """

    def __init__(self, backend_url: str):
        self.verify_url = f"{backend_url}/api/smtp-users/verify"

    def __call__(self, server, session, envelope, mechanism, auth_data):
        if not isinstance(auth_data, LoginPassword):
            return AuthResult(success=False, handled=True)

        try:
            username = auth_data.login.decode() if isinstance(auth_data.login, bytes) else auth_data.login
            password = auth_data.password.decode() if isinstance(auth_data.password, bytes) else auth_data.password
        except Exception:
            return AuthResult(success=False, handled=True)

        peer = getattr(session, "peer", ("?",))[0]
        try:
            resp = requests.post(
                self.verify_url,
                json={"username": username, "password": password},
                timeout=5,
            )
            if resp.status_code == 200:
                logger.info(f"SMTP auth OK: user='{username}' peer={peer}")
                return AuthResult(success=True)
        except Exception as e:
            logger.error(f"Auth backend unreachable: {e}")

        logger.warning(f"SMTP auth FAILED: user='{username}' peer={peer}")
        return AuthResult(success=False, handled=False)
