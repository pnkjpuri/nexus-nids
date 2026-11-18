from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    event_type = Column(String, nullable=True, index=True)
    severity = Column(String, default="medium", index=True)
    src_ip = Column(String, nullable=True, index=True)
    dest_ip = Column(String, nullable=True, index=True)
    src_port = Column(Integer, nullable=True)
    dest_port = Column(Integer, nullable=True)
    protocol = Column(String, default="TCP")
    description = Column(String, nullable=True)
    raw_event = Column(JSON, nullable=True)
    rule_id = Column(String(100), nullable=True)
    title = Column(String(255), nullable=True)
    status = Column(String(50), default="detected")
    action = Column(String(50), nullable=True)
    signature = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    source_ip = Column(String(100), nullable=True)
    destination_ip = Column(String(100), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)