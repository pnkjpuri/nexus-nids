from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base

class Event(Base):
    __tablename__ = "events"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String, index=True)
    severity = Column(String, index=True)
    src_ip = Column(String, index=True)
    dest_ip = Column(String, index=True)
    src_port = Column(Integer, nullable=True)
    dest_port = Column(Integer, nullable=True)
    protocol = Column(String, nullable=True)
    description = Column(String, nullable=True)
    raw_event = Column(JSON, nullable=True)