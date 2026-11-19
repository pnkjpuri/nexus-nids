from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String

from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    event_type = Column(String, index=True)
    severity = Column(String, index=True)
    src_ip = Column(String, index=True)
    dest_ip = Column(String, index=True)
    src_port = Column(Integer)
    dest_port = Column(Integer)
    protocol = Column(String)
    description = Column(String)
    raw_event = Column(JSON)

    # Enterprise SOC & Correlation fields
    rule_id = Column(String(100), nullable=True)
    title = Column(String(255), nullable=True)
    status = Column(String(50), default="open", index=True)
    action = Column(String(50), default="logged")
    signature = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    source_ip = Column(String(100), nullable=True)
    destination_ip = Column(String(100), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)

