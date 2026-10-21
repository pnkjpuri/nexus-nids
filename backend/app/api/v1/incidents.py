from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.incident import CorrelatedIncidentResponse

router = APIRouter()


@router.get("/correlated", response_model=List[CorrelatedIncidentResponse])
def get_correlated_incidents(db: Session = Depends(get_db)):
    """
    Groups recent high-severity alerts by source IP into correlated multi-stage incident scenarios.
    """
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(100).all()

    # Group alerts by source IP
    incidents_map = {}
    for alert in alerts:
        src = alert.source_ip
        if src not in incidents_map:
            incidents_map[src] = {
                "id": f"INC-{abs(hash(src)) % 10000:04d}",
                "title": f"Multi-Stage Attack Pattern from {src}",
                "source_ip": src,
                "target_ip": alert.destination_ip,
                "severity": alert.severity,
                "stage_count": 0,
                "created_at": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S") if alert.timestamp else "N/A",
                "status": "OPEN",
                "stages": []
            }
        
        incidents_map[src]["stages"].append({
            "timestamp": alert.timestamp.strftime("%H:%M:%S") if alert.timestamp else "N/A",
            "signature": alert.signature,
            "protocol": alert.protocol
        })
        incidents_map[src]["stage_count"] += 1
        if alert.severity > incidents_map[src]["severity"]:
            incidents_map[src]["severity"] = alert.severity

    return list(incidents_map.values())