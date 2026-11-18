import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.database import engine, Base
from app.models import alert, enterprise  # noqa: F401
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.enterprise import router as enterprise_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NEXUS NIDS Enterprise SOC API", version="2.1.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "change-this-in-production-32-char-secret"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,  # Required for HTTP-only session cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(enterprise_router, prefix="/api/v1")