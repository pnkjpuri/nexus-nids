from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.user import User
from app.services.correlation import correlate_threat_events

router = APIRouter(prefix="/incidents", tags=["Incident Response & Correlation"])

@router.get("/correlated")
def get_correlated_incidents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incidents = correlate_threat_events(db)
    return {"active_correlated_incidents": incidents}