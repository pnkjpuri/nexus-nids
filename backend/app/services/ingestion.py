from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.event import Event
from app.models.sensor import Sensor
from app.services.cia_mapping import calculate_cia_impact


def process_eve_event(db: Session, eve_data: dict, owner_id: Optional[int] = None) -> dict:
    sensor = db.query(Sensor).filter(Sensor.ip_address == "127.0.0.1").first()
    if not sensor:
        sensor = Sensor(
            name="Primary Suricata Sensor",
            ip_address="127.0.0.1",
            status="active",
        )
        db.add(sensor)
        db.commit()
        db.refresh(sensor)

    event_type = eve_data.get("event_type", "flow")
    src_ip = eve_data.get("src_ip", "0.0.0.0")
    src_port = eve_data.get("src_port", 0)
    dest_ip = eve_data.get("dest_ip", "0.0.0.0")
    dest_port = eve_data.get("dest_port", 0)
    proto = eve_data.get("proto", "TCP")

    raw_ts = eve_data.get("timestamp")
    event_ts = datetime.now(timezone.utc)
    if raw_ts:
        try:
            event_ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            event_ts = datetime.now(timezone.utc)

    net_event = Event(
        timestamp=event_ts.replace(tzinfo=None),
        event_type=event_type,
        severity="low",
        src_ip=src_ip,
        dest_ip=dest_ip,
        src_port=src_port,
        dest_port=dest_port,
        protocol=proto,
        description=f"EVE {event_type} from {src_ip} to {dest_ip}",
        raw_event=eve_data,
    )
    db.add(net_event)
    db.commit()
    db.refresh(net_event)

    if event_type == "alert" and "alert" in eve_data:
        alert_info = eve_data.get("alert", {})
        category = alert_info.get("category", "Unclassified Threat")
        signature = alert_info.get("signature", "Suspicious Network Activity")
        severity_val = alert_info.get("severity", 3)

        severity_map = {1: "low", 2: "medium", 3: "critical", 4: "critical"}
        severity_label = severity_map.get(severity_val, "medium")
        cia = calculate_cia_impact(category, severity_label)

        alert_entry = Alert(
            owner_id=owner_id,
            timestamp=event_ts,
            event_type=category,
            category=category,
            signature=signature,
            title=signature,
            rule_id=str(alert_info.get("signature_id", "EVE-001")),
            severity=severity_label,
            src_ip=src_ip,
            dest_ip=dest_ip,
            source_ip=src_ip,
            destination_ip=dest_ip,
            src_port=src_port,
            dest_port=dest_port,
            source_port=src_port,
            destination_port=dest_port,
            protocol=proto,
            description=f"{signature} [{category}] | CIA={cia}",
            action=alert_info.get("action", "logged"),
            status="detected",
            raw_event=eve_data,
        )
        db.add(alert_entry)
        db.commit()

    return {"type": event_type, "event_id": str(net_event.id)}