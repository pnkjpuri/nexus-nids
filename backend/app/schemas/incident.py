from typing import List

from pydantic import BaseModel


class IncidentStage(BaseModel):
    timestamp: str
    signature: str
    protocol: str


class CorrelatedIncidentResponse(BaseModel):
    id: str
    title: str
    source_ip: str
    target_ip: str
    severity: int
    stage_count: int
    created_at: str
    status: str
    stages: List[IncidentStage] = []

    class Config:
        from_attributes = True