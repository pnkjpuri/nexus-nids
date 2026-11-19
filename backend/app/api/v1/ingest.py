"""Sensor-only ingestion. X-Owner-Email is deliberately ignored."""
import os
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.enterprise import User
from app.services.ingestion import process_eve_event

router = APIRouter()


class EvePayload(BaseModel):
    event_type: str = "flow"
    model_config = {"extra": "allow"}


@router.post("/ingest")
def ingest_event(
    payload: EvePayload,
    x_sensor_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    expected = os.getenv("NEXUS_SENSOR_KEY", "")
    if not expected or not x_sensor_key or not secrets.compare_digest(expected, x_sensor_key):
        raise HTTPException(401, "Valid sensor API key required")
    owner_email = os.getenv("NEXUS_SENSOR_OWNER_EMAIL", "").strip().lower()
    user = db.query(User).filter(User.email == owner_email, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(503, "Configured sensor owner not found; set NEXUS_SENSOR_OWNER_EMAIL")
    return process_eve_event(db, payload.model_dump(), owner_id=user.id)
