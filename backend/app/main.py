import asyncio
import os
import random
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1 import alerts, auth, dashboard, enterprise, incidents, sensors
from app.core.database import Base, engine

# Create tables cleanly without duplicate metadata conflicts
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "NEXUS NIDS"),
    version="2.1.0",
    description="Enterprise Network Intrusion Detection & Active Mitigation API",
)

# Required for Authlib Google & GitHub OAuth state validation
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv(
        "SESSION_SECRET_KEY",
        os.getenv("SECRET_KEY", "nexus_nids_session_secret_key_super_secure_2026"),
    ),
    same_site="lax",
    https_only=False,
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register your exact API v1 Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(sensors.router, prefix="/api/v1", tags=["Sensors"])
app.include_router(enterprise.router, prefix="/api/v1", tags=["Enterprise & Profile"])


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "nexus-nids-backend"}


async def _telemetry_background_loop():
    vectors = ["SYN Flood", "SQLi Probe", "SSH Brute Force", "XSS Payload", "Port Scan", "Normal TLS"]
    while True:
        try:
            if hasattr(dashboard, "record_telemetry_tick"):
                vec = random.choice(vectors)
                dashboard.record_telemetry_tick(
                    {
                        "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                        "pps": random.randint(310, 1420),
                        "threats": 0 if vec == "Normal TLS" else random.randint(2, 18),
                        "src_ip": f"45.155.{random.randint(1, 254)}.{random.randint(1, 254)}",
                        "vector": vec,
                    }
                )
        except Exception:
            pass
        await asyncio.sleep(2)


@app.on_event("startup")
async def start_background_telemetry():
    asyncio.create_task(_telemetry_background_loop())