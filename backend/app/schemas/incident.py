from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class CorrelatedIncidentResponse(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    created_at: datetime
    description: Optional[str] = None
    affected_assets: List[str] = []
    related_alerts_count: int = 0

    class Config:
        from_attributes = True