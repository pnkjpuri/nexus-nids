import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.enterprise import User
from app.models.alert import Alert

router = APIRouter()


@router.get("/export")
def export_alerts(format: str = "csv", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if format != "csv":
        raise HTTPException(status_code=400, detail="Only CSV export is supported")
    # Prevent non-admin users exporting other people's alerts.
    query = db.query(Alert)
    if user.role.lower() != "admin":
        query = query.filter(Alert.owner_id == user.id)
    records = query.order_by(Alert.timestamp.desc()).limit(10000).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "timestamp_utc", "severity", "category", "event_type", "source_ip", "destination_ip", "action", "description"])
    for row in records:
        writer.writerow([row.id, row.timestamp.isoformat() if row.timestamp else "", row.severity or "", row.category or "", row.event_type or "", row.src_ip or "", row.dest_ip or "", row.action or "", row.description or ""])
    buffer.seek(0)
    filename = f"nexus-alerts-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.csv"
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

