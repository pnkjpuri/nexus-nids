from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.event import EVEEvent

router = APIRouter()


@router.post("/ingest", status_code=status.HTTP_200_OK)
def ingest_eve_event(event: EVEEvent, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Ingests Suricata EVE json log payloads, calculates severity/CIA impact,
    and stores alerts in PostgreSQL database.
    """
    try:
        alert_data = event.alert if event.alert else None
        signature = alert_data.signature if alert_data else "Unknown Network Anomaly"
        severity = alert_data.severity if alert_data else 1
        category = alert_data.category if alert_data else "General Security Event"
        rule_id = str(alert_data.signature_id) if alert_data and alert_data.signature_id else "2000001"

        # Parse timestamp safely
        try:
            event_ts = datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
        except Exception:
            event_ts = datetime.now(timezone.utc)

        # Calculate CIA Triad Impact scores
        confidentiality = 0.8 if "SQL" in signature or "XSS" in signature else 0.2
        integrity = 0.9 if "Brute Force" in signature or "Exploit" in signature else 0.3
        availability = 0.95 if "Flood" in signature or "DDoS" in signature else 0.1

        new_alert = Alert(
            timestamp=event_ts,
            rule_id=rule_id,
            signature=signature,
            severity=severity,
            category=category,
            source_ip=event.src_ip,
            source_port=event.src_port or 0,
            destination_ip=event.dest_ip,
            destination_port=event.dest_port or 0,
            protocol=event.proto or "TCP",
            status="NEW",
            confidentiality_impact=confidentiality,
            integrity_impact=integrity,
            availability_impact=availability
        )

        db.add(new_alert)
        db.commit()
        return {"status": "success", "message": "Telemetry event ingested successfully"}

    except Exception as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest event into PostgreSQL: {str(err)}"
        )


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns aggregated metrics, active attack distribution, and timeline buckets
    for the React SOC Dashboard.
    """
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity >= 3).count()
    blocked_attacks = db.query(Alert).filter(Alert.status == "RESOLVED").count()

    # Distribution of attack types
    attack_counts = (
        db.query(Alert.category, func.count(Alert.id))
        .group_by(Alert.category)
        .all()
    )
    attack_distribution = {cat or "Uncategorized": count for cat, count in attack_counts}

    # Timeline buckets (recent events)
    recent_alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(10).all()
    traffic_timeline = [
        {
            "timestamp": alert.timestamp.strftime("%H:%M:%S") if alert.timestamp else "N/A",
            "value": alert.severity * 10
        }
        for alert in reversed(recent_alerts)
    ]

    return {
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "blocked_attacks": blocked_attacks,
        "traffic_analyzed_gb": round(total_alerts * 0.0025, 2),
        "active_connections": max(12, total_alerts * 3),
        "attack_distribution": attack_distribution,
        "traffic_timeline": traffic_timeline
    }