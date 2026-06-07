import logging, threading, requests


class BackendLogHandler(logging.Handler):
    """Fire-and-forget logging handler that ships log records to the backend."""

    def __init__(self, backend_url: str, proxy_secret: str, service: str = "smtp-proxy"):
        super().__init__(level=logging.INFO)
        self.url     = f"{backend_url}/api/logs/ingest"
        self.headers = {"X-Proxy-Token": proxy_secret, "Content-Type": "application/json"}
        self.service = service

    def emit(self, record):
        try:
            msg  = self.format(record)
            data = {"level": record.levelname, "service": self.service, "message": msg}
            threading.Thread(target=self._send, args=(data,), daemon=True).start()
        except Exception:
            pass

    def _send(self, data):
        try:
            requests.post(self.url, json=data, headers=self.headers, timeout=3)
        except Exception:
            pass
