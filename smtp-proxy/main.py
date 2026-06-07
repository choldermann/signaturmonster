import asyncio, logging, os
from dotenv import load_dotenv
from aiosmtpd.controller import Controller
from handler import SignaturmonsterHandler
from auth import SMTPAuthenticator
from rate_limiter import RateLimiter
from tls_utils import ensure_tls_context

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def main():
    backend_url  = os.getenv("BACKEND_URL", "http://backend:8000")
    smtp_port    = int(os.getenv("SMTP_PORT", 587))
    rate_per_min = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))

    ssl_ctx      = ensure_tls_context()
    rate_limiter = RateLimiter(max_per_minute=rate_per_min)
    authenticator = SMTPAuthenticator(backend_url=backend_url)

    handler = SignaturmonsterHandler(backend_url=backend_url, rate_limiter=rate_limiter)

    controller = Controller(
        handler,
        hostname="0.0.0.0",
        port=smtp_port,
        tls_context=ssl_ctx,
        require_starttls=True,
        auth_required=True,
        auth_require_tls=True,
        authenticator=authenticator,
    )
    controller.start()
    logger.info(f"Signaturmonster SMTP Proxy on port {smtp_port} (STARTTLS required, AUTH required)")
    try:
        await asyncio.Event().wait()
    finally:
        controller.stop()

if __name__ == "__main__":
    asyncio.run(main())
