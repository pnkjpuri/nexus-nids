from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.core.security import get_current_user
from app.models.enterprise import User

router = APIRouter()


def record_telemetry_tick(tick: Dict[str, Any]) -> None:
    """Legacy hook; no simulated detections are included in real attack metrics."""
    return None


@router.get("/telemetry/live")
@router.get("/stats")
@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Alert)
    if user.role != "admin":
        query = query.filter(Alert.owner_id == user.id)
    alerts = query.order_by(Alert.timestamp.desc()).limit(500).all()
    total = query.count()
    critical = query.filter(Alert.severity.ilike("critical")).count()
    blocked = query.filter(Alert.action.ilike("blocked")).count()

    categories = Counter((a.category or a.event_type or "Unclassified").strip() for a in alerts)
    # Actual stored detections, not random demo traffic.
    bucket_counts = Counter()
    for alert in alerts:
        if alert.timestamp:
            bucket_counts[alert.timestamp.strftime("%H:%M")] += 1
    timeline = [{"timestamp": k, "value": v} for k, v in sorted(bucket_counts.items())][-24:]
    top = [{"name": name, "count": count} for name, count in categories.most_common(8)]
    return {
        "status": "online",
        "series": [],
        "latest": None,
        "kpis": {
            "total_alerts": total,
            "critical_alerts": critical,
            "blocked_attacks": blocked,
            "traffic_gb": 0.0,
            "active_connections": 0,
        },
        "total_alerts": total,
        "critical_alerts": critical,
        "blocked_attacks": blocked,
        # No packet-capture counters exist here; do not fabricate traffic volumes.
        "traffic_analyzed_gb": 0.0,
        "active_connections": 0,
        "attack_distribution": dict(categories),
        "top_attack_types": top,
        "traffic_timeline": timeline,
    }
