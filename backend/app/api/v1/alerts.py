from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.models.enterprise import User

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
    status: Optional[str] = "detected"


class AlertStatusUpdate(BaseModel):
    status: str


@router.get("/")
def list_alerts(
    severity: Optional[str] = None,
    status_param: Optional[str] = Query(None, alias="status"),
    ip: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if current_user.role != "admin":
        query = query.filter(Alert.owner_id == current_user.id)
    if severity and severity.lower() != "all":
        query = query.filter(Alert.severity.ilike(severity))
    if status_param and status_param.lower() != "all":
        query = query.filter(Alert.status.ilike(status_param))
    if ip:
        pattern = f"%{ip.strip()}%"
        query = query.filter(
            or_(
                Alert.src_ip.ilike(pattern),
                Alert.dest_ip.ilike(pattern),
                Alert.source_ip.ilike(pattern),
                Alert.destination_ip.ilike(pattern),
            )
        )
    return query.order_by(Alert.id.desc()).limit(limit).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_in: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
        status=alert_in.status or "detected",
        owner_id=current_user.id,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return {"message": "Alert created successfully", "alert_id": new_alert.id}


@router.patch("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if current_user.role != "admin" and alert.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not permitted")
    alert.status = payload.status.strip().lower()
    if alert.status == "blocked":
        alert.action = "blocked"
    db.commit()
    return {"message": "Alert status updated", "status": alert.status}