import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    ip_address = Column(String(45), nullable=False)
    status = Column(String(20), default="ONLINE")  # ONLINE, OFFLINE, DEGRADED
    last_heartbeat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    version = Column(String(50), nullable=True)

class NetworkEvent(Base):
    __tablename__ = "network_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    src_ip = Column(String(45), nullable=False, index=True)
    src_port = Column(Integer, nullable=True)
    dest_ip = Column(String(45), nullable=False, index=True)
    dest_port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=False)
    event_type = Column(String(50), nullable=False)  # alert, flow, http, dns
    raw_payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sid = Column(Integer, unique=True, nullable=False)
    revision = Column(Integer, nullable=False, default=1)
    category = Column(String(100), nullable=False)
    signature = Column(String(255), nullable=False)
    severity_level = Column(String(20), nullable=False)  # Critical, High, Medium, Low, Info
    mitre_technique = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("network_events.id", ondelete="CASCADE"), nullable=True)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("detection_rules.id", ondelete="SET NULL"), nullable=True)
    severity = Column(String(20), nullable=False)
    confidence_score = Column(Numeric(3, 2), default=0.85)
    cia_confidentiality_impact = Column(String(20), default="NONE")
    cia_integrity_impact = Column(String(20), default="NONE")
    cia_availability_impact = Column(String(20), default="NONE")
    evidence_summary = Column(Text, nullable=False)
    status = Column(String(20), default="NEW")  # NEW, UNDER_INVESTIGATION, RESOLVED, FALSE_POSITIVE
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))