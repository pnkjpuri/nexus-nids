from typing import Optional
from pydantic import BaseModel


class AlertDetails(BaseModel):
    action: Optional[str] = "allowed"
    gid: Optional[int] = 1
    signature_id: Optional[int] = 2000001
    rev: Optional[int] = 1
    signature: str = "Generic Attack Alert"
    category: str = "Network Anomaly"
    severity: int = 1


class EVEEvent(BaseModel):
    event_type: str = "alert"
    timestamp: str
    src_ip: str
    src_port: Optional[int] = 0
    dest_ip: str
    dest_port: Optional[int] = 0
    proto: Optional[str] = "TCP"
    alert: Optional[AlertDetails] = None