from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.models.enterprise import User
from app.schemas.incident import CorrelatedIncidentResponse

router = APIRouter()


def _severity_to_int(sev) -> int:
    if isinstance(sev, int):
        return sev
    mapping = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    return mapping.get(str(sev or "").strip().lower(), 2)


@router.get("/correlated", response_model=List[CorrelatedIncidentResponse])
def get_correlated_incidents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Groups recent alerts belonging to the authenticated user by source IP
    into correlated multi-stage incident scenarios.
    """
    alerts = (
        db.query(Alert)
        .filter(Alert.owner_id == user.id)
        .order_by(Alert.timestamp.desc())
        .limit(100)
        .all()
    )

    incidents_map = {}
    for alert in alerts:
        src = alert.src_ip or alert.source_ip or "0.0.0.0"
        dst = alert.dest_ip or alert.destination_ip or "0.0.0.0"
        sev_num = _severity_to_int(alert.severity)
        sig = alert.signature or alert.event_type or alert.rule_id or "Intrusion Event"

        if src not in incidents_map:
            incidents_map[src] = {
                "id": f"INC-{abs(hash(src)) % 10000:04d}",
                "title": f"Multi-Stage Attack Pattern from {src}",
                "source_ip": src,
                "target_ip": dst,
                "severity": sev_num,
                "stage_count": 0,
                "created_at": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S") if alert.timestamp else "N/A",
                "status": "OPEN",
                "stages": [],
            }

        incidents_map[src]["stages"].append({
            "timestamp": alert.timestamp.strftime("%H:%M:%S") if alert.timestamp else "N/A",
            "signature": sig,
            "protocol": alert.protocol or "TCP",
        })
        incidents_map[src]["stage_count"] += 1
        if sev_num > incidents_map[src]["severity"]:
            incidents_map[src]["severity"] = sev_num

    return list(incidents_map.values())
