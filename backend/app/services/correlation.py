from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.models.event import NetworkEvent, Alert
from app.models.user import AuditLog
import hashlib
import json

def correlate_threat_events(db: Session, window_minutes: int = 10, threshold: int = 5):
    """Groups high-frequency alerts from the same source IP into correlated security incidents."""
    time_threshold = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

    # Find IPs generating frequent alerts
    frequent_sources = db.query(
        NetworkEvent.src_ip,
        func.count(Alert.id).label("alert_count")
    ).join(Alert, Alert.event_id == NetworkEvent.id)\
     .filter(Alert.created_at >= time_threshold)\
     .group_by(NetworkEvent.src_ip)\
     .having(func.count(Alert.id) >= threshold)\
     .all()

    correlated_incidents = []
    for src_ip, count in frequent_sources:
        correlated_incidents.append({
            "source_ip": src_ip,
            "total_alerts": count,
            "window_minutes": window_minutes,
            "threat_classification": "High-Volume Targeted Intrusion Campaign",
            "recommended_action": f"Block IP address {src_ip} on perimeter firewall."
        })

    return correlated_incidents

def generate_audit_hash(prev_hash: str, actor_id: str, action: str, payload: dict) -> str:
    """Generates a SHA-256 cryptographic hash chain entry for tamper-evident audit logs."""
    data_str = f"{prev_hash}:{actor_id}:{action}:{json.dumps(payload, sort_keys=True)}"
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()