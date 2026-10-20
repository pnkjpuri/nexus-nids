from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.event import NetworkEvent, Alert
from app.services.ingestion import process_eve_event
import csv
import io

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.post("/ingest")
def ingest_eve_event(event_data: dict, db: Session = Depends(get_db)):
    try:
        processed = process_eve_event(db, event_data)
        return {"status": "success", "processed_type": processed["type"]}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Ingestion error: {str(e)}")

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    try:
        total_events = db.query(NetworkEvent).count()
        total_alerts = db.query(Alert).count()
        
        critical_alerts = db.query(Alert).filter(Alert.severity == "Critical").count()
        high_alerts = db.query(Alert).filter(Alert.severity == "High").count()
        medium_alerts = db.query(Alert).filter(Alert.severity == "Medium").count()
        low_alerts = db.query(Alert).filter(Alert.severity == "Low").count()

        recent_alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(5).all()

        return {
            "total_events": total_events,
            "total_alerts": total_alerts,
            "alerts_by_severity": {
                "Critical": critical_alerts,
                "High": high_alerts,
                "Medium": medium_alerts,
                "Low": low_alerts
            },
            "recent_alerts": [
                {
                    "id": str(a.id),
                    "severity": a.severity,
                    "evidence": a.evidence_summary,
                    "status": a.status,
                    "created_at": a.created_at.isoformat() if a.created_at else ""
                } for a in recent_alerts
            ]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Summary retrieval error: {str(e)}")

@router.get("/export-report")
def export_csv_report(db: Session = Depends(get_db)):
    try:
        alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(100).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Alert ID", "Severity", "Evidence Summary", "Status", "Timestamp"])
        
        for a in alerts:
            writer.writerow([str(a.id), a.severity, a.evidence_summary, a.status, str(a.created_at)])
        
        response = Response(content=output.getvalue(), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=nexus_nids_threat_report.csv"
        return response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")