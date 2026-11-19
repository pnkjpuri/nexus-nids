"""Controlled, local-only detection demo. Does NOT transmit attacks or packets."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, record_audit
from app.models.enterprise import User
from app.models.alert import Alert

router = APIRouter()
SAMPLES = {
    "port_scan": ("Port Scan", "medium", "Suspicious sequential connection attempts"),
    "brute_force": ("Brute Force", "high", "Repeated failed login attempts"),
    "traffic_anomaly": ("Traffic Anomaly", "low", "Unexpected traffic volume pattern"),
}

@router.post("/generate")
def generate(request: Request, kind: str = "port_scan", count: int = 1,
             db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Simulation requires analyst or admin role")
    if kind not in SAMPLES or not 1 <= count <= 10:
        raise HTTPException(422, "Unknown simulation type or invalid count (1–10)")
    name, severity, description = SAMPLES[kind]
    for _ in range(count):
        db.add(Alert(owner_id=user.id, category=name, event_type=name, severity=severity,
                     title=f"[SIMULATED] {name}", description=f"[SIMULATED] {description}",
                     src_ip="192.0.2.10", dest_ip="198.51.100.20", protocol="TCP",
                     action="logged", raw_event={"simulated": True, "kind": kind}))
    db.commit()
    record_audit(db, user.email, user.role, "SIMULATION_CREATED", "alerts",
                 f"{count} samples: {kind}", request.client.host if request and request.client else "127.0.0.1")
    return {"created": count, "simulated": True, "category": name}
