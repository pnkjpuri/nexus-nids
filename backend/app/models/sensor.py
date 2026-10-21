from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.database import Base

class Sensor(Base):
    __tablename__ = "sensors"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    ip_address = Column(String)
    status = Column(String, default="active")
    last_seen = Column(DateTime, default=datetime.utcnow)