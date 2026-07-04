from __future__ import annotations

import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import cors_origin_list, settings
from app.db import get_db, init_db
from app.routers import (
    accounts,
    admin,
    ai,
    ai_extra,
    announcements,
    auth,
    budgets,
    chat,
    comments,
    couple,
    couple_social,
    feedback,
    growth,
    import_export,
    meta,
    savings_plan,
    stats,
    transactions,
)
from app.ws import manager

_rate_buckets: dict[str, list[float]] = defaultdict(list)
_RATE_EXEMPT = ("/api/health", "/api/feature-flags", "/api/meta")
_AUTH_STRICT_PREFIXES = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/couple/join",
)
_AUTH_LIMIT = 15


def _client_ip(scope) -> str:
    """Resolve the real client IP, honoring the nginx reverse proxy.

    Without this, every request appears to come from 127.0.0.1 (the proxy), so all
    users share a single rate-limit bucket and get throttled together.
    """
    for raw_name, raw_value in scope.get("headers", []):
        if raw_name == b"x-forwarded-for":
            forwarded = raw_value.decode("latin-1").split(",")[0].strip()
            if forwarded:
                return forwarded
    client = scope.get("client")
    return client[0] if client else "unknown"


class RateLimitMiddleware:
    def __init__(self, app, limit: int = 120, window: int = 60):
        self.app = app
        self.limit = limit
        self.window = window
        self._last_sweep = 0.0

    def _sweep(self, now: float) -> None:
        # Periodically drop stale/empty buckets so memory does not grow unbounded.
        if now - self._last_sweep < self.window:
            return
        self._last_sweep = now
        for ip in list(_rate_buckets.keys()):
            fresh = [t for t in _rate_buckets[ip] if now - t < self.window]
            if fresh:
                _rate_buckets[ip] = fresh
            else:
                del _rate_buckets[ip]

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in _RATE_EXEMPT:
            await self.app(scope, receive, send)
            return

        ip = _client_ip(scope)
        strict = any(path.startswith(p) for p in _AUTH_STRICT_PREFIXES)
        limit = _AUTH_LIMIT if strict else self.limit
        bucket_key = f"{ip}:auth" if strict else ip
        now = time.time()
        self._sweep(now)
        bucket = [t for t in _rate_buckets[bucket_key] if now - t < self.window]

        if len(bucket) >= limit:
            _rate_buckets[bucket_key] = bucket
            response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
            await response(scope, receive, send)
            return

        bucket.append(now)
        _rate_buckets[bucket_key] = bucket
        await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Couple Ledger API", version=settings.api_version, lifespan=lifespan)

_origins = cors_origin_list()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(RateLimitMiddleware, limit=settings.rate_limit_per_minute)

app.include_router(meta.router)
app.include_router(auth.router)
app.include_router(couple.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(savings_plan.router)
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(ai.router)
app.include_router(couple_social.router)
app.include_router(comments.router)
app.include_router(ai_extra.router)
app.include_router(import_export.router)
app.include_router(admin.router)
app.include_router(feedback.router)
app.include_router(announcements.router)
app.include_router(growth.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/feature-flags")
def feature_flags() -> dict[str, bool]:
    with get_db() as conn:
        rows = conn.execute("SELECT key, enabled FROM feature_flags").fetchall()
    return {r["key"]: bool(r["enabled"]) for r in rows}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    await manager.handle(websocket, token)
