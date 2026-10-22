from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.dashboard import router as dashboard_router

app = FastAPI(title="NEXUS NIDS API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount router across root, /api/v1, and /api/v1/dashboard to handle all route aliases
app.include_router(dashboard_router)
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1/dashboard")