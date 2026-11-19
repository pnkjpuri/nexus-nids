from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.user import User
from app.models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["Threat Alerts"])


class AlertCreate(BaseModel):
    rule_id: Optional[str] = "NEXUS-000"
    title: Optional[str] = "Security Alert"
    severity: Optional[str] = "medium"
    event_type: Optional[str] = "Intrusion"
    src_ip: Optional[str] = "0.0.0.0"
    dest_ip: Optional[str] = "0.0.0.0"
    src_port: Optional[int] = 0
    dest_port: Optional[int] = 0
    protocol: Optional[str] = "TCP"
    description: Optional[str] = ""
    action: Optional[str] = "logged"
    category: Optional[str] = "General"


@router.get("/")
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).order_by(Alert.id.desc()).limit(100).all()
    return alerts


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_alert = Alert(
        rule_id=alert_in.rule_id,
        title=alert_in.title,
        severity=alert_in.severity,
        event_type=alert_in.event_type,
        src_ip=alert_in.src_ip,
        dest_ip=alert_in.dest_ip,
        src_port=alert_in.src_port,
        dest_port=alert_in.dest_port,
        protocol=alert_in.protocol,
        description=alert_in.description,
        action=alert_in.action,
        category=alert_in.category,
        source_ip=alert_in.src_ip,
        destination_ip=alert_in.dest_ip,
        source_port=alert_in.src_port,
        destination_port=alert_in.dest_port,
        status="open",
        owner_id=current_user.id if hasattr(current_user, "id") else None
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return {"message": "Alert created successfully", "alert_id": new_alert.id}


@router.patch("/{alert_id}/status")
def update_alert_status(alert_id: str, new_status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = new_status
    db.commit()
    return {"message": "Alert status updated", "status": alert.status}