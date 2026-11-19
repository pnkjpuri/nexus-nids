import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1 import (
    alerts,
    auth,
    dashboard,
    enterprise,
    incidents,
    ingest,
    reports,
    sensors,
    simulation,
)
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "NEXUS NIDS"),
    version="2.1.0",
    description="Enterprise Network Intrusion Detection & Active Mitigation API",
)

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

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(simulation.router, prefix="/api/v1/simulation", tags=["Safe Simulation"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(sensors.router, prefix="/api/v1", tags=["Sensors"])
app.include_router(enterprise.router, prefix="/api/v1", tags=["Enterprise & Profile"])
app.include_router(ingest.router, prefix="/api/v1", tags=["Ingestion"])


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "nexus-nids-backend"}