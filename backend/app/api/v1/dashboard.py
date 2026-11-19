from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert

router = APIRouter()

_TELEMETRY_BUFFER: deque = deque(maxlen=60)


def record_telemetry_tick(tick: Dict[str, Any]) -> None:
    _TELEMETRY_BUFFER.append(tick)


def _get_or_seed_ticks() -> List[Dict[str, Any]]:
    if not _TELEMETRY_BUFFER:
        now = datetime.now(timezone.utc).strftime("%H:%M:%S")
        _TELEMETRY_BUFFER.append(
            {
                "time": now,
                "pps": 420,
                "threats": 0,
                "src_ip": "10.0.14.22",
                "vector": "Normal TLS",
            }
        )
    return list(_TELEMETRY_BUFFER)


@router.get("/telemetry/live")
def get_live_telemetry(db: Session = Depends(get_db)):
    ticks = _get_or_seed_ticks()
    latest = ticks[-1]
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "critical").count()
    blocked_attacks = db.query(Alert).filter(Alert.action == "blocked").count()

    vector_counts: Dict[str, int] = {}
    for item in ticks:
        vec = item.get("vector", "Normal TLS")
        if vec != "Normal TLS":
            vector_counts[vec] = vector_counts.get(vec, 0) + max(1, int(item.get("threats", 1)))

    top_attack_types = [
        {"name": name, "count": count}
        for name, count in sorted(vector_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "status": "online",
        "latest": latest,
        "series": ticks,
        "kpis": {
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "blocked_attacks": blocked_attacks,
            "traffic_gb": round(sum(t.get("pps", 0) for t in ticks) * 0.00012, 2),
            "active_connections": latest.get("pps", 320),
        },
        "top_attack_types": top_attack_types,
    }


@router.get("/stats")
@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    return get_live_telemetry(db=db)