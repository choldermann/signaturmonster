import time, logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, max_per_minute: int = 30):
        self.max_per_minute = max_per_minute
        self._windows: dict[str, list[float]] = defaultdict(list)

    def check(self, ip: str) -> bool:
        now = time.monotonic()
        cutoff = now - 60.0
        bucket = self._windows[ip]
        self._windows[ip] = [t for t in bucket if t > cutoff]
        if len(self._windows[ip]) >= self.max_per_minute:
            logger.warning(f"Rate limit exceeded for {ip} ({len(self._windows[ip])}/min, limit {self.max_per_minute})")
            return False
        self._windows[ip].append(now)
        return True
