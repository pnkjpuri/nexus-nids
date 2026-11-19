"""Store Suricata EVE events and map alert events to real Alert columns."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.alert import Alert

SEVERITIES = {1: "critical", 2: "high", 3: "medium", 4: "low"}


def process_eve_event(db: Session, eve_data: dict, owner_id: int | None = None) -> dict:
    raw_ts = eve_data.get("timestamp")
    try:
        timestamp = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00")) if raw_ts else datetime.now(timezone.utc)
    except (ValueError, TypeError):
        timestamp = datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    raw_kind = str(eve_data.get("event_type") or "flow")
    legacy_detection = ("rule_id" in eve_data and "severity" in eve_data)
    benign_rule = str(eve_data.get("rule_id", "")) in {"NIDS-BASE-001", "NIDS-TLS-010", "NIDS-DNS-005", "NIDS-UDP-002", "NIDS-ICMP-003"}
    kind = "alert" if legacy_detection and not benign_rule else ("flow" if legacy_detection else raw_kind)

    src = str(eve_data.get("src_ip") or eve_data.get("source_ip") or "0.0.0.0")
    dst = str(eve_data.get("dest_ip") or eve_data.get("destination_ip") or "0.0.0.0")
    proto = str(eve_data.get("proto") or eve_data.get("protocol") or "IP")
    src_port = eve_data.get("src_port") if eve_data.get("src_port") is not None else eve_data.get("source_port")
    dest_port = eve_data.get("dest_port") if eve_data.get("dest_port") is not None else eve_data.get("destination_port")

    event = Event(
        timestamp=timestamp,
        event_type=kind,
        src_ip=src,
        dest_ip=dst,
        src_port=src_port,
        dest_port=dest_port,
        protocol=proto,
        raw_event=eve_data,
    )
    db.add(event)
    db.flush()
    result = {"type": kind, "event_id": event.id, "alert_created": False}

    details = eve_data.get("alert")
    if legacy_detection and not benign_rule:
        severity_label = str(eve_data.get("severity", "medium")).lower()
        numeric = {"critical": 1, "high": 2, "medium": 3, "low": 4}.get(severity_label, 3)
        details = {
            "signature": raw_kind,
            "category": raw_kind,
            "severity": numeric,
            "action": "logged",
        }

    if kind == "alert" and isinstance(details, dict):
        raw_sev = details.get("severity", 3)
        severity = SEVERITIES.get(int(raw_sev), "medium") if str(raw_sev).isdigit() else str(raw_sev).lower()
        signature = str(details.get("signature") or "Unclassified detection")
        category = str(details.get("category") or "Unclassified")
        alert = Alert(
            owner_id=owner_id,
            timestamp=timestamp,
            event_type=signature,
            severity=severity,
            src_ip=src,
            dest_ip=dst,
            source_ip=src,
            destination_ip=dst,
            src_port=src_port,
            dest_port=dest_port,
            source_port=src_port,
            destination_port=dest_port,
            protocol=proto,
            title=signature,
            signature=signature,
            category=category,
            description=str(eve_data.get("description") or signature),
            action=str(details.get("action") or "logged"),
            raw_event={**eve_data, **({"simulated": True} if eve_data.get("simulated") else {})},
            status="open",
        )
        db.add(alert)
        db.flush()
        result.update(alert_created=True, alert_id=alert.id)

    db.commit()
    return result
