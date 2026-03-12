from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit: int = 30, window: int = 60):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window = window
        self.clients = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit auth endpoints
        if not request.url.path.startswith("/api/auth/"):
            return await call_next(request)

        # Get real client IP from X-Forwarded-For or X-Real-IP
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.headers.get("x-real-ip", "")
            or (request.client.host if request.client else "unknown")
        )
        now = time.time()

        # Clean old entries
        self.clients[client_ip] = [t for t in self.clients[client_ip] if now - t < self.window]

        if len(self.clients[client_ip]) >= self.rate_limit:
            raise HTTPException(
                status_code=429,
                detail="Trop de requetes. Veuillez patienter avant de reessayer."
            )

        self.clients[client_ip].append(now)
        return await call_next(request)
