from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.user import User
from app.models.event import Sensor

router = APIRouter(prefix="/sensors", tags=["Sensor Management"])

@router.get("/")
def list_sensors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensors = db.query(Sensor).all()
    return sensors