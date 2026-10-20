from sqlalchemy.orm import Session
from app.models.event import NetworkEvent, Alert, Sensor
from app.services.cia_mapping import calculate_cia_impact
from datetime import datetime, timezone

def process_eve_event(db: Session, eve_data: dict) -> dict:
    # Ensure default primary sensor exists
    sensor = db.query(Sensor).filter(Sensor.ip_address == "127.0.0.1").first()
    if not sensor:
        sensor = Sensor(
            name="Primary Suricata Sensor",
            ip_address="127.0.0.1",
            status="ONLINE"
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

    # Parse ISO timestamp safely or fallback to current UTC time
    raw_ts = eve_data.get("timestamp")
    event_ts = datetime.now(timezone.utc)
    if raw_ts:
        try:
            event_ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            event_ts = datetime.now(timezone.utc)

    # Save network event
    net_event = NetworkEvent(
        sensor_id=sensor.id,
        timestamp=event_ts,
        event_type=event_type,
        src_ip=src_ip,
        src_port=src_port,
        dest_ip=dest_ip,
        dest_port=dest_port,
        protocol=proto,
        raw_payload=eve_data
    )
    db.add(net_event)
    db.commit()
    db.refresh(net_event)

    # Process alert details if event contains alert payload
    if event_type == "alert" and "alert" in eve_data:
        alert_info = eve_data.get("alert", {})
        category = alert_info.get("category", "Unclassified Threat")
        signature = alert_info.get("signature", "Suspicious Network Activity")
        severity_val = alert_info.get("severity", 3)

        severity_map = {1: "Critical", 2: "High", 3: "Medium", 4: "Low"}
        severity_label = severity_map.get(severity_val, "Medium")

        cia = calculate_cia_impact(category, severity_label)

        alert_entry = Alert(
            event_id=net_event.id,
            severity=severity_label,
            evidence_summary=f"{signature} [{category}]",
            cia_confidentiality_impact=cia.get("confidentiality", 0),
            cia_integrity_impact=cia.get("integrity", 0),
            cia_availability_impact=cia.get("availability", 0),
            status="NEW"
        )
        db.add(alert_entry)
        db.commit()

    return {"type": event_type, "event_id": str(net_event.id)}