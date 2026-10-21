from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, nullable=True, index=True)
    signature = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True, index=True)
    action = Column(String, nullable=True)
    status = Column(String, default="NEW", nullable=True, index=True)
    title = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String, nullable=True, index=True)
    severity = Column(String, nullable=True, index=True)
    
    # Standard Short Column Names
    src_ip = Column(String, nullable=True, index=True)
    dest_ip = Column(String, nullable=True, index=True)
    src_port = Column(Integer, nullable=True)
    dest_port = Column(Integer, nullable=True)
    
    # Ingestion API Payload Aliases
    source_ip = Column(String, nullable=True, index=True)
    destination_ip = Column(String, nullable=True, index=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    
    protocol = Column(String, nullable=True)
    description = Column(String, nullable=True)
    raw_event = Column(JSON, nullable=True)